import { SeededRandom } from "../random";
import { validateFigureFrameStructure } from "./validation";
import type {
  FigureCandidate,
  FigureFrame,
  FigureGridDefinition,
  FigureSymbolRuleSet,
} from "./types";

export function visibleFrameValue(frame: FigureFrame): string {
  return JSON.stringify(
    [...frame.symbols]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map(({ id, shape, color, fill, orientation, row, column }) => ({
        id,
        shape,
        color,
        fill,
        orientation: shape === "circle" ? 0 : orientation,
        row,
        column,
      })),
  );
}

function visibleSymbolValue(symbol: FigureFrame["symbols"][number]): string {
  const { id, shape, color, fill, orientation, row, column } = symbol;
  return JSON.stringify({
    id,
    shape,
    color,
    fill,
    orientation: shape === "circle" ? 0 : orientation,
    row,
    column,
  });
}

export function figureFrameSimilarity(first: FigureFrame, second: FigureFrame): number {
  if (first.symbols.length === 0 || first.symbols.length !== second.symbols.length) return 0;
  const secondById = new Map(second.symbols.map((symbol) => [symbol.id, symbol]));
  const unchanged = first.symbols.filter((symbol) => {
    const other = secondById.get(symbol.id);
    return other && visibleSymbolValue(symbol) === visibleSymbolValue(other);
  }).length;
  return unchanged / first.symbols.length;
}

function candidateFrame(frame: FigureFrame, index: number): FigureFrame {
  return { ...structuredClone(frame), index };
}

export function createFigureCandidates(
  grid: FigureGridDefinition,
  correctFrame: FigureFrame,
  previousFrame: FigureFrame,
  rules: readonly FigureSymbolRuleSet[],
  random: SeededRandom,
  slot: number,
): { candidates: FigureCandidate[]; correctCandidateId: string } {
  const correctValue = visibleFrameValue(correctFrame);
  const variants: FigureFrame[] = [];
  const seen = new Set([correctValue]);
  const add = (frame: FigureFrame) => {
    const normalized = candidateFrame(frame, correctFrame.index);
    const value = visibleFrameValue(normalized);
    if (
      !seen.has(value) &&
      validateFigureFrameStructure(grid, normalized).valid
    ) {
      seen.add(value);
      variants.push(normalized);
    }
  };

  for (const symbol of random.shuffle(correctFrame.symbols)) {
    const rule = rules.find((item) => item.symbolId === symbol.id);
    const previousSymbol = previousFrame.symbols.find((item) => item.id === symbol.id);
    if (previousSymbol) {
      const stalled = structuredClone(correctFrame);
      const target = stalled.symbols.find((item) => item.id === symbol.id);
      if (target) Object.assign(target, structuredClone(previousSymbol));
      add(stalled);
    }
    if (rule?.rotation && symbol.shape !== "circle") {
      for (const turn of random.shuffle([90, 270] as const)) {
        const rotated = structuredClone(correctFrame);
        const target = rotated.symbols.find((item) => item.id === symbol.id);
        if (target) target.orientation = ((target.orientation + turn) % 360) as typeof target.orientation;
        add(rotated);
      }
    }
    if (rule?.colour) {
      for (const phase of random.shuffle([-1, 1])) {
        const recoloured = structuredClone(correctFrame);
        const colourTarget = recoloured.symbols.find((item) => item.id === symbol.id);
        if (colourTarget) {
          const current = rule.colour.cycle.indexOf(colourTarget.color);
          colourTarget.color = rule.colour.cycle[
            (current + phase + rule.colour.cycle.length) % rule.colour.cycle.length
          ];
        }
        add(recoloured);
      }
    }
    if (rule?.movement) {
      const directions = random.shuffle([
        { row: -1, column: 0 },
        { row: 1, column: 0 },
        { row: 0, column: -1 },
        { row: 0, column: 1 },
      ]);
      for (const direction of directions) {
        const shifted = structuredClone(correctFrame);
        const target = shifted.symbols.find((item) => item.id === symbol.id);
        if (target) {
          target.row += direction.row;
          target.column += direction.column;
        }
        add(shifted);
      }
    }
  }
  if (variants.length < 2) {
    throw new Error("Unable to construct two distinct plausible figure distractors.");
  }

  const correctCandidateId = `slot-${slot}-correct`;
  const selectedVariants = random.shuffle(variants).slice(0, 2);
  const raw: FigureCandidate[] = [
    { id: correctCandidateId, label: "", frame: candidateFrame(correctFrame, correctFrame.index) },
    { id: `slot-${slot}-distractor-1`, label: "", frame: selectedVariants[0] },
    { id: `slot-${slot}-distractor-2`, label: "", frame: selectedVariants[1] },
  ];
  const candidates = random.shuffle(raw).map((candidate, index) => ({
    ...candidate,
    label: String.fromCharCode(65 + index),
  }));
  return { candidates, correctCandidateId };
}
