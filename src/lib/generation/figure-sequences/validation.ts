import {
  FIGURE_COLORS,
  FIGURE_SHAPES,
  type FigureFrame,
  type FigureFrameValidation,
  type FigureGridDefinition,
} from "./types";

export function validateFigureFrameStructure(
  grid: FigureGridDefinition,
  frame: FigureFrame,
): FigureFrameValidation {
  const issues: string[] = [];
  if (
    !Number.isSafeInteger(grid.rows) ||
    !Number.isSafeInteger(grid.columns) ||
    grid.rows < 2 ||
    grid.columns < 2 ||
    grid.rows > 8 ||
    grid.columns > 8
  ) {
    issues.push("Grid dimensions must be safe integers from 2 through 8.");
  }
  if (!Number.isSafeInteger(frame.index) || frame.index < 0) {
    issues.push("Frame index must be a non-negative safe integer.");
  }

  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const symbol of frame.symbols) {
    if (!symbol.id.trim() || ids.has(symbol.id)) {
      issues.push("Symbol identities must be non-empty and unique within a frame.");
    }
    ids.add(symbol.id);
    if (!FIGURE_SHAPES.includes(symbol.shape)) issues.push(`Unsupported shape: ${symbol.shape}.`);
    if (!FIGURE_COLORS.includes(symbol.color)) issues.push(`Unsupported colour: ${symbol.color}.`);
    if (![0, 90, 180, 270].includes(symbol.orientation)) {
      issues.push("Orientation must be a multiple of 90 degrees.");
    }
    if (
      !Number.isSafeInteger(symbol.row) ||
      !Number.isSafeInteger(symbol.column) ||
      symbol.row < 0 ||
      symbol.row >= grid.rows ||
      symbol.column < 0 ||
      symbol.column >= grid.columns
    ) {
      issues.push(`Symbol ${symbol.id || "(unnamed)"} is outside the matrix.`);
    }
    const position = `${symbol.row}:${symbol.column}`;
    if (positions.has(position)) issues.push("Figures cannot overlap within a matrix.");
    positions.add(position);
  }
  return issues.length ? { valid: false, issues } : { valid: true };
}

