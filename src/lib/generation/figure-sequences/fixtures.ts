import type {
  FigureFrame,
  FigureSequencePresentation,
  FigureSymbolState,
  FigureSymbolRuleSet,
} from "./types";
import { replayFigureSequence } from "./engine";

function symbol(
  id: string,
  shape: FigureSymbolState["shape"],
  color: FigureSymbolState["color"],
  row: number,
  column: number,
  orientation: FigureSymbolState["orientation"] = 0,
): FigureSymbolState {
  return { id, shape, color, row, column, orientation, fill: "solid" };
}

function frame(
  index: number,
  arrowColumn: number,
  diamondRow: number,
  arrowOrientation: FigureSymbolState["orientation"],
): FigureFrame {
  return {
    index,
    symbols: [
      symbol("arrow", "arrow", "blue", 1, arrowColumn, arrowOrientation),
      symbol("diamond", "diamond", "orange", diamondRow, 3),
    ],
  };
}

export const FIGURE_RENDERER_FIXTURE: FigureSequencePresentation = {
  grid: { rows: 4, columns: 4 },
  visibleFrames: [
    frame(0, 0, 3, 0),
    frame(1, 1, 2, 90),
    frame(2, 2, 1, 180),
    frame(3, 3, 0, 270),
  ],
  missingMatrices: [
    {
      sequenceIndex: 4,
      candidates: [
        { id: "m5-a", label: "A", frame: frame(4, 2, 1, 0) },
        { id: "m5-b", label: "B", frame: frame(4, 3, 2, 0) },
        { id: "m5-c", label: "C", frame: frame(4, 2, 0, 90) },
      ],
    },
    {
      sequenceIndex: 5,
      candidates: [
        { id: "m6-a", label: "A", frame: frame(5, 1, 2, 90) },
        { id: "m6-b", label: "B", frame: frame(5, 2, 2, 180) },
        { id: "m6-c", label: "C", frame: frame(5, 1, 1, 90) },
      ],
    },
  ],
};

export const FIGURE_TRANSFORMATION_GRID = { rows: 5, columns: 5 } as const;

export const FIGURE_TRANSFORMATION_RULES: FigureSymbolRuleSet[] = [
  {
    symbolId: "arrow",
    movement: {
      kind: "linear",
      direction: "right",
      steps: 1,
      progression: "fixed",
      boundary: "bounce",
    },
    rotation: {
      direction: "clockwise",
      quarterTurns: 1,
      progression: "fixed",
    },
  },
  {
    symbolId: "diamond",
    movement: {
      kind: "border",
      direction: "clockwise",
      steps: 2,
      progression: "fixed",
    },
    colour: {
      cycle: ["orange", "green", "pink"],
      steps: 1,
      progression: "fixed",
    },
  },
];

export const FIGURE_TRANSFORMATION_FRAMES = replayFigureSequence(
  FIGURE_TRANSFORMATION_GRID,
  {
    index: 0,
    symbols: [
      symbol("arrow", "arrow", "blue", 2, 0),
      symbol("diamond", "diamond", "orange", 0, 0),
    ],
  },
  FIGURE_TRANSFORMATION_RULES,
  5,
);
