import type { QuestionSolver } from "../types";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  LATIN_SQUARE_SOLVER_VERSION,
  type LatinSquareCandidate,
  type LatinSymbol,
  type LatinTargetSolverOutcome,
  type VisibleLatinGrid,
} from "./types";

function validGridShape(grid: VisibleLatinGrid): boolean {
  return (
    grid.length === LATIN_SQUARE_SIZE &&
    grid.every((row) => row.length === LATIN_SQUARE_SIZE)
  );
}

function hasKnownDuplicates(grid: VisibleLatinGrid): boolean {
  for (let index = 0; index < LATIN_SQUARE_SIZE; index += 1) {
    const row = grid[index].filter((value): value is LatinSymbol => value !== null);
    const column = grid
      .map((gridRow) => gridRow[index])
      .filter((value): value is LatinSymbol => value !== null);
    if (new Set(row).size !== row.length || new Set(column).size !== column.length) {
      return true;
    }
  }
  return false;
}

function canPlace(
  grid: VisibleLatinGrid,
  row: number,
  column: number,
  symbol: LatinSymbol,
): boolean {
  return (
    !grid[row].includes(symbol) &&
    !grid.some((gridRow) => gridRow[column] === symbol)
  );
}

function hasCompletion(grid: VisibleLatinGrid): {
  found: boolean;
  exploredAssignments: number;
} {
  let exploredAssignments = 0;

  const search = (): boolean => {
    let best: { row: number; column: number; candidates: LatinSymbol[] } | null = null;
    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        if (grid[row][column] !== null) continue;
        const candidates = DEFAULT_LATIN_SYMBOLS.filter((symbol) =>
          canPlace(grid, row, column, symbol),
        );
        if (candidates.length === 0) return false;
        if (!best || candidates.length < best.candidates.length) {
          best = { row, column, candidates: [...candidates] };
        }
      }
    }
    if (!best) return true;
    const cell = best as { row: number; column: number; candidates: LatinSymbol[] };
    for (const symbol of cell.candidates) {
      exploredAssignments += 1;
      grid[cell.row][cell.column] = symbol;
      if (search()) {
        grid[cell.row][cell.column] = null;
        return true;
      }
      grid[cell.row][cell.column] = null;
    }
    return false;
  };

  return { found: search(), exploredAssignments };
}

export class LatinSquareSolver
  implements QuestionSolver<LatinSquareCandidate, LatinTargetSolverOutcome>
{
  readonly questionType = "latin_square" as const;
  readonly version = LATIN_SQUARE_SOLVER_VERSION;

  solve(candidate: LatinSquareCandidate): LatinTargetSolverOutcome {
    const { grid, target, symbols, size } = candidate.structuredData;
    if (
      size !== LATIN_SQUARE_SIZE ||
      !validGridShape(grid) ||
      target.row < 0 ||
      target.row >= LATIN_SQUARE_SIZE ||
      target.column < 0 ||
      target.column >= LATIN_SQUARE_SIZE ||
      grid[target.row][target.column] !== null ||
      symbols.join("") !== DEFAULT_LATIN_SYMBOLS.join("") ||
      grid.flat().some((value) => value !== null && !symbols.includes(value)) ||
      hasKnownDuplicates(grid)
    ) {
      return {
        status: "invalid",
        possibleTargetSymbols: [],
        exploredAssignments: 0,
        reason: "Invalid Latin-square structure or clues.",
      };
    }

    const possibleTargetSymbols: LatinSymbol[] = [];
    let exploredAssignments = 0;
    for (const symbol of DEFAULT_LATIN_SYMBOLS) {
      const trial = grid.map((row) => [...row]);
      if (!canPlace(trial, target.row, target.column, symbol)) continue;
      trial[target.row][target.column] = symbol;
      const completion = hasCompletion(trial);
      exploredAssignments += completion.exploredAssignments;
      if (completion.found) possibleTargetSymbols.push(symbol);
    }

    return {
      status:
        possibleTargetSymbols.length === 0
          ? "none"
          : possibleTargetSymbols.length === 1
            ? "unique"
            : "multiple",
      possibleTargetSymbols,
      exploredAssignments,
      reason: null,
    };
  }
}

export const latinSquareSolver = new LatinSquareSolver();

