import { SeededRandom } from "../random";
import { validateFigureFrameStructure } from "./validation";
import type {
  FigureCandidate,
  FigureColor,
  FigureFrame,
  FigureGridDefinition,
} from "./types";

const COLOUR_PHASES: FigureColor[] = [
  "blue",
  "pink",
  "yellow",
  "orange",
  "green",
  "black",
  "white",
];

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

function candidateFrame(frame: FigureFrame, index: number): FigureFrame {
  return { ...structuredClone(frame), index };
}

export function createFigureCandidates(
  grid: FigureGridDefinition,
  correctFrame: FigureFrame,
  previousFrame: FigureFrame,
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

  add(previousFrame);
  for (const symbol of correctFrame.symbols) {
    if (symbol.shape !== "circle") {
      const rotated = structuredClone(correctFrame);
      const target = rotated.symbols.find((item) => item.id === symbol.id);
      if (target) target.orientation = ((target.orientation + 90) % 360) as typeof target.orientation;
      add(rotated);
    }
    const recoloured = structuredClone(correctFrame);
    const colourTarget = recoloured.symbols.find((item) => item.id === symbol.id);
    if (colourTarget) {
      const current = COLOUR_PHASES.indexOf(colourTarget.color);
      colourTarget.color = COLOUR_PHASES[(current + 1) % COLOUR_PHASES.length];
    }
    add(recoloured);
  }
  const directions = random.shuffle([
    { row: -1, column: 0 },
    { row: 1, column: 0 },
    { row: 0, column: -1 },
    { row: 0, column: 1 },
  ]);
  for (const direction of directions) {
    const shifted = structuredClone(correctFrame);
    shifted.symbols[0].row += direction.row;
    shifted.symbols[0].column += direction.column;
    add(shifted);
  }
  if (variants.length < 2) {
    throw new Error("Unable to construct two distinct plausible figure distractors.");
  }

  const correctCandidateId = `slot-${slot}-correct`;
  const raw: FigureCandidate[] = [
    { id: correctCandidateId, label: "", frame: candidateFrame(correctFrame, correctFrame.index) },
    { id: `slot-${slot}-distractor-1`, label: "", frame: variants[0] },
    { id: `slot-${slot}-distractor-2`, label: "", frame: variants[1] },
  ];
  const candidates = random.shuffle(raw).map((candidate, index) => ({
    ...candidate,
    label: String.fromCharCode(65 + index),
  }));
  return { candidates, correctCandidateId };
}

