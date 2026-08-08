import type { GenerationDifficulty } from "../types";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  type LatinDeduction,
  type LatinDifficultyMetrics,
  type LatinSquareCandidate,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "./types";

function key(row: number, column: number): string {
  return `${row}:${column}`;
}

function candidatesFor(
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

function dependencyDepth(
  depths: ReadonlyMap<string, number>,
  row: number,
  column: number,
): number {
  let depth = 0;
  for (let index = 0; index < LATIN_SQUARE_SIZE; index += 1) {
    depth = Math.max(
      depth,
      depths.get(key(row, index)) ?? 0,
      depths.get(key(index, column)) ?? 0,
    );
  }
  return depth + 1;
}

export function deriveLatinDeductions(candidate: LatinSquareCandidate): LatinDeduction[] {
  const grid = candidate.structuredData.grid.map((row) => [...row]);
  const deductions: LatinDeduction[] = [];
  const depths = new Map<string, number>();

  for (let round = 1; round <= LATIN_SQUARE_SIZE * LATIN_SQUARE_SIZE; round += 1) {
    const proposed = new Map<string, Omit<LatinDeduction, "round" | "depth">>();
    const candidateMap = new Map<string, LatinSymbol[]>();
    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        if (grid[row][column] !== null) continue;
        const candidates = candidatesFor(grid, row, column);
        candidateMap.set(key(row, column), candidates);
        if (candidates.length === 1) {
          proposed.set(key(row, column), {
            coordinate: { row, column },
            symbol: candidates[0],
            reason: "single_candidate",
          });
        }
      }
    }

    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (const symbol of DEFAULT_LATIN_SYMBOLS) {
        if (grid[row].includes(symbol)) continue;
        const columns = Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) => column)
          .filter((column) => candidateMap.get(key(row, column))?.includes(symbol));
        if (columns.length === 1 && !proposed.has(key(row, columns[0]))) {
          proposed.set(key(row, columns[0]), {
            coordinate: { row, column: columns[0] },
            symbol,
            reason: "only_position_in_row",
          });
        }
      }
    }
    for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
      for (const symbol of DEFAULT_LATIN_SYMBOLS) {
        if (grid.some((row) => row[column] === symbol)) continue;
        const rows = Array.from({ length: LATIN_SQUARE_SIZE }, (_, row) => row)
          .filter((row) => candidateMap.get(key(row, column))?.includes(symbol));
        if (rows.length === 1 && !proposed.has(key(rows[0], column))) {
          proposed.set(key(rows[0], column), {
            coordinate: { row: rows[0], column },
            symbol,
            reason: "only_position_in_column",
          });
        }
      }
    }

    if (proposed.size === 0) break;
    const ordered = [...proposed.values()].sort(
      (first, second) =>
        first.coordinate.row - second.coordinate.row ||
        first.coordinate.column - second.coordinate.column,
    );
    let applied = 0;
    for (const deduction of ordered) {
      const { row, column } = deduction.coordinate;
      if (grid[row][column] !== null || !candidatesFor(grid, row, column).includes(deduction.symbol)) {
        continue;
      }
      const depth = dependencyDepth(depths, row, column);
      grid[row][column] = deduction.symbol;
      depths.set(key(row, column), depth);
      deductions.push({ ...deduction, round, depth });
      applied += 1;
    }
    if (applied === 0) break;
  }
  return deductions;
}

export function calculateLatinDifficulty(
  candidate: LatinSquareCandidate,
  deductions: readonly LatinDeduction[],
): { difficulty: GenerationDifficulty; metrics: LatinDifficultyMetrics } | null {
  const { target, grid } = candidate.structuredData;
  const targetStepIndex = deductions.findIndex(
    (deduction) =>
      deduction.coordinate.row === target.row &&
      deduction.coordinate.column === target.column,
  );
  if (targetStepIndex < 0) return null;
  const targetDeduction = deductions[targetStepIndex];
  const score = targetStepIndex + Math.max(0, targetDeduction.depth - 1) * 2;
  const difficulty: GenerationDifficulty =
    targetStepIndex <= 1 && targetDeduction.depth <= 2
      ? "easy"
      : targetStepIndex <= 5 && targetDeduction.depth <= 4
        ? "medium"
        : "hard";
  return {
    difficulty,
    metrics: {
      targetStepIndex,
      targetDepth: targetDeduction.depth,
      targetRound: targetDeduction.round,
      totalDeductions: deductions.length,
      visibleClues: grid.flat().filter((value) => value !== null).length,
      score,
    },
  };
}

export function explainLatinDeductions(
  deductions: readonly LatinDeduction[],
  target: { row: number; column: number },
): string {
  const reasonText = {
    single_candidate: "it is the only letter missing from its row and column",
    only_position_in_row: "it is the only position available for that letter in the row",
    only_position_in_column: "it is the only position available for that letter in the column",
  } as const;
  const throughTarget = deductions.slice(
    0,
    deductions.findIndex(
      (deduction) =>
        deduction.coordinate.row === target.row &&
        deduction.coordinate.column === target.column,
    ) + 1,
  );
  return throughTarget
    .map(
      (deduction, index) =>
        `${index + 1}. Put ${deduction.symbol} in row ${deduction.coordinate.row + 1}, column ${deduction.coordinate.column + 1}, because ${reasonText[deduction.reason]}.`,
    )
    .join("\n");
}

