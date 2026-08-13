import type { GenerationDifficulty } from "../types";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  type LatinCoordinate,
  type LatinDeduction,
  type LatinDeductionAnalysis,
  type LatinDeductionReason,
  type LatinDifficultyMetrics,
  type LatinSquareCandidate,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "./types";

const key = (row: number, column: number) => `${row}:${column}`;
const sameCoordinate = (first: LatinCoordinate, second: LatinCoordinate) =>
  first.row === second.row && first.column === second.column;

export function latinCandidatesFor(
  grid: VisibleLatinGrid,
  row: number,
  column: number,
): LatinSymbol[] {
  if (grid[row][column] !== null) return [];
  const used = new Set<LatinSymbol>();
  for (const symbol of grid[row]) if (symbol !== null) used.add(symbol);
  for (const gridRow of grid) {
    const symbol = gridRow[column];
    if (symbol !== null) used.add(symbol);
  }
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !used.has(symbol));
}

function uniqueCoordinates(coordinates: readonly LatinCoordinate[]): LatinCoordinate[] {
  return [...new Map(coordinates.map((coordinate) => [key(coordinate.row, coordinate.column), coordinate])).values()];
}

function directDeductionDependencies(
  depths: ReadonlyMap<string, number>,
  row: number,
  column: number,
): LatinCoordinate[] {
  const dependencies: LatinCoordinate[] = [];
  for (const coordinateKey of depths.keys()) {
    const [dependencyRow, dependencyColumn] = coordinateKey.split(":").map(Number);
    if (dependencyRow === row || dependencyColumn === column) {
      dependencies.push({ row: dependencyRow, column: dependencyColumn });
    }
  }
  return dependencies;
}

function hiddenSingleDependencies(
  grid: VisibleLatinGrid,
  depths: ReadonlyMap<string, number>,
  candidateMap: ReadonlyMap<string, LatinSymbol[]>,
  row: number,
  column: number,
  symbol: LatinSymbol,
  reason: LatinDeductionReason,
): LatinCoordinate[] {
  const dependencies = directDeductionDependencies(depths, row, column);
  if (reason === "only_position_in_row") {
    for (let otherColumn = 0; otherColumn < LATIN_SQUARE_SIZE; otherColumn += 1) {
      if (otherColumn === column || grid[row][otherColumn] !== null) continue;
      if (candidateMap.get(key(row, otherColumn))?.includes(symbol)) continue;
      for (let blockerRow = 0; blockerRow < LATIN_SQUARE_SIZE; blockerRow += 1) {
        if (grid[blockerRow][otherColumn] === symbol && depths.has(key(blockerRow, otherColumn))) {
          dependencies.push({ row: blockerRow, column: otherColumn });
        }
      }
    }
  } else if (reason === "only_position_in_column") {
    for (let otherRow = 0; otherRow < LATIN_SQUARE_SIZE; otherRow += 1) {
      if (otherRow === row || grid[otherRow][column] !== null) continue;
      if (candidateMap.get(key(otherRow, column))?.includes(symbol)) continue;
      for (let blockerColumn = 0; blockerColumn < LATIN_SQUARE_SIZE; blockerColumn += 1) {
        if (grid[otherRow][blockerColumn] === symbol && depths.has(key(otherRow, blockerColumn))) {
          dependencies.push({ row: otherRow, column: blockerColumn });
        }
      }
    }
  }
  return uniqueCoordinates(dependencies);
}

function dependencyDepth(
  depths: ReadonlyMap<string, number>,
  dependencies: readonly LatinCoordinate[],
): number {
  return 1 + Math.max(0, ...dependencies.map((coordinate) =>
    depths.get(key(coordinate.row, coordinate.column)) ?? 0),
  );
}

export function analyzeLatinDeductions(candidate: LatinSquareCandidate): LatinDeductionAnalysis {
  const initialGrid = candidate.structuredData.grid;
  const { target } = candidate.structuredData;
  const targetInitialCandidateCount = latinCandidatesFor(initialGrid, target.row, target.column).length;
  const directRowEliminations = new Set(initialGrid[target.row].filter((symbol): symbol is LatinSymbol => symbol !== null)).size;
  const directColumnEliminations = new Set(
    initialGrid.map((row) => row[target.column]).filter((symbol): symbol is LatinSymbol => symbol !== null),
  ).size;
  const grid = initialGrid.map((row) => [...row]);
  const deductions: LatinDeduction[] = [];
  const depths = new Map<string, number>();

  for (let round = 1; round <= LATIN_SQUARE_SIZE * LATIN_SQUARE_SIZE; round += 1) {
    const proposed = new Map<string, Omit<LatinDeduction, "round" | "depth">>();
    const conflicts = new Set<string>();
    const candidateMap = new Map<string, LatinSymbol[]>();
    const propose = (
      row: number,
      column: number,
      symbol: LatinSymbol,
      reason: LatinDeductionReason,
    ) => {
      const coordinateKey = key(row, column);
      if (conflicts.has(coordinateKey)) return;
      const dependencies = hiddenSingleDependencies(
        grid,
        depths,
        candidateMap,
        row,
        column,
        symbol,
        reason,
      );
      const existing = proposed.get(coordinateKey);
      if (existing && existing.symbol !== symbol) {
        proposed.delete(coordinateKey);
        conflicts.add(coordinateKey);
        return;
      }
      if (!existing || reason === "single_candidate") {
        proposed.set(coordinateKey, {
          coordinate: { row, column },
          symbol,
          reason,
          dependencies,
        });
      }
    };

    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        if (grid[row][column] !== null) continue;
        const candidates = latinCandidatesFor(grid, row, column);
        candidateMap.set(key(row, column), candidates);
        if (candidates.length === 1) propose(row, column, candidates[0], "single_candidate");
      }
    }
    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (const symbol of DEFAULT_LATIN_SYMBOLS) {
        if (grid[row].includes(symbol)) continue;
        const columns = Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) => column)
          .filter((column) => candidateMap.get(key(row, column))?.includes(symbol));
        if (columns.length === 1) propose(row, columns[0], symbol, "only_position_in_row");
      }
    }
    for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
      for (const symbol of DEFAULT_LATIN_SYMBOLS) {
        if (grid.some((row) => row[column] === symbol)) continue;
        const rows = Array.from({ length: LATIN_SQUARE_SIZE }, (_, row) => row)
          .filter((row) => candidateMap.get(key(row, column))?.includes(symbol));
        if (rows.length === 1) propose(rows[0], column, symbol, "only_position_in_column");
      }
    }

    if (proposed.size === 0) break;
    const ordered = [...proposed.values()].sort((first, second) =>
      first.coordinate.row - second.coordinate.row || first.coordinate.column - second.coordinate.column,
    );
    let applied = 0;
    for (const deduction of ordered) {
      const { row, column } = deduction.coordinate;
      if (grid[row][column] !== null || !latinCandidatesFor(grid, row, column).includes(deduction.symbol)) continue;
      const depth = dependencyDepth(depths, deduction.dependencies);
      grid[row][column] = deduction.symbol;
      depths.set(key(row, column), depth);
      deductions.push({ ...deduction, round, depth });
      applied += 1;
    }
    if (applied === 0) break;
  }
  return {
    deductions,
    targetInitialCandidateCount,
    directRowEliminations,
    directColumnEliminations,
  };
}

export function deriveLatinDeductions(candidate: LatinSquareCandidate): LatinDeduction[] {
  return analyzeLatinDeductions(candidate).deductions;
}

function targetDependencyClosure(
  deductions: readonly LatinDeduction[],
  target: LatinCoordinate,
): Set<string> {
  const byKey = new Map(deductions.map((deduction) => [
    key(deduction.coordinate.row, deduction.coordinate.column),
    deduction,
  ]));
  const closure = new Set<string>();
  const visit = (coordinate: LatinCoordinate) => {
    const coordinateKey = key(coordinate.row, coordinate.column);
    if (closure.has(coordinateKey)) return;
    const deduction = byKey.get(coordinateKey);
    if (!deduction) return;
    closure.add(coordinateKey);
    deduction.dependencies.forEach(visit);
  };
  visit(target);
  return closure;
}

export function calculateLatinDifficulty(
  candidate: LatinSquareCandidate,
  analysis: LatinDeductionAnalysis,
): { difficulty: GenerationDifficulty; metrics: LatinDifficultyMetrics } | null {
  const { target, grid } = candidate.structuredData;
  const { deductions } = analysis;
  const targetStepIndex = deductions.findIndex((deduction) => sameCoordinate(deduction.coordinate, target));
  if (targetStepIndex < 0) return null;
  const targetDeduction = deductions[targetStepIndex];
  const closure = targetDependencyClosure(deductions, target);
  const closureDeductions = deductions.filter((deduction) =>
    closure.has(key(deduction.coordinate.row, deduction.coordinate.column)),
  );
  let rowDependencyCount = 0;
  let columnDependencyCount = 0;
  closureDeductions.forEach((deduction) => {
    deduction.dependencies.forEach((dependency) => {
      if (!closure.has(key(dependency.row, dependency.column))) return;
      if (dependency.row === deduction.coordinate.row) rowDependencyCount += 1;
      if (dependency.column === deduction.coordinate.column) columnDependencyCount += 1;
      if (
        dependency.row !== deduction.coordinate.row &&
        dependency.column !== deduction.coordinate.column
      ) {
        if (deduction.reason === "only_position_in_row") rowDependencyCount += 1;
        if (deduction.reason === "only_position_in_column") columnDependencyCount += 1;
      }
    });
  });
  const usefulClues = grid.flatMap((row, rowIndex) => row.map((symbol, columnIndex) => ({
    symbol,
    coordinate: { row: rowIndex, column: columnIndex },
  }))).filter(({ symbol, coordinate }) =>
    symbol !== null && closureDeductions.some((deduction) =>
      deduction.coordinate.row === coordinate.row || deduction.coordinate.column === coordinate.column),
  );
  const clueDistanceFromTarget = usefulClues.length
    ? usefulClues.reduce((total, clue) => total +
        Math.abs(clue.coordinate.row - target.row) + Math.abs(clue.coordinate.column - target.column), 0) /
      usefulClues.length
    : 0;
  const forcedPlacementsBeforeTarget = Math.max(0, closure.size - 1);
  const classification = targetDeduction.depth === 1 && forcedPlacementsBeforeTarget === 0
    ? "direct"
    : targetDeduction.depth >= 3 || targetDeduction.round >= 3
      ? "multi_stage"
      : "indirect";
  const visibleClues = grid.flat().filter((value) => value !== null).length;
  const workingMemoryLoad = closure.size + analysis.targetInitialCandidateCount +
    rowDependencyCount + columnDependencyCount;
  const score =
    analysis.targetInitialCandidateCount * 2 +
    targetDeduction.depth * 3 +
    targetDeduction.round +
    forcedPlacementsBeforeTarget * 2 +
    rowDependencyCount +
    columnDependencyCount +
    Math.max(0, 13 - visibleClues) +
    Math.round(clueDistanceFromTarget);

  const easyProfile =
    analysis.targetInitialCandidateCount <= 2 &&
    targetDeduction.depth <= 2 &&
    forcedPlacementsBeforeTarget <= 1 &&
    classification !== "multi_stage";
  const mediumProfile =
    analysis.targetInitialCandidateCount >= 2 &&
    classification === "indirect" &&
    targetDeduction.depth >= 2 &&
    forcedPlacementsBeforeTarget >= 1;
  const hardProfile =
    analysis.targetInitialCandidateCount >= 3 &&
    classification === "multi_stage" &&
    forcedPlacementsBeforeTarget >= 4 &&
    (rowDependencyCount > 0 || columnDependencyCount > 0);
  const difficulty: GenerationDifficulty = easyProfile
    ? "easy"
    : mediumProfile
      ? "medium"
      : hardProfile
        ? "hard"
        : classification === "direct"
          ? "easy"
          : classification === "multi_stage"
            ? "hard"
            : analysis.targetInitialCandidateCount <= 1
              ? "easy"
              : "medium";
  return {
    difficulty,
    metrics: {
      targetStepIndex,
      targetDepth: targetDeduction.depth,
      targetRound: targetDeduction.round,
      totalDeductions: deductions.length,
      visibleClues,
      targetInitialCandidateCount: analysis.targetInitialCandidateCount,
      directRowEliminations: analysis.directRowEliminations,
      directColumnEliminations: analysis.directColumnEliminations,
      forcedPlacementsBeforeTarget,
      rowDependencyCount,
      columnDependencyCount,
      usefulClueCount: usefulClues.length,
      clueDistanceFromTarget: Number(clueDistanceFromTarget.toFixed(3)),
      workingMemoryLoad,
      classification,
      score,
    },
  };
}

export function explainLatinDeductions(
  deductions: readonly LatinDeduction[],
  target: LatinCoordinate,
): string {
  const closure = targetDependencyClosure(deductions, target);
  return deductions
    .filter((deduction) => closure.has(key(deduction.coordinate.row, deduction.coordinate.column)))
    .map((deduction, index) => {
      const row = deduction.coordinate.row + 1;
      const column = deduction.coordinate.column + 1;
      const reason = deduction.reason === "single_candidate"
        ? `the existing row and column entries leave only ${deduction.symbol}`
        : deduction.reason === "only_position_in_row"
          ? `column ${column} is the only remaining position for ${deduction.symbol} in row ${row}`
          : `row ${row} is the only remaining position for ${deduction.symbol} in column ${column}`;
      return `${index + 1}. Put ${deduction.symbol} in row ${row}, column ${column}, because ${reason}.`;
    })
    .join("\n");
}
