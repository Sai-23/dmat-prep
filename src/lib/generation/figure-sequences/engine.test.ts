import { describe, expect, it } from "vitest";

import { evolveFigureFrame, replayFigureSequence } from "./engine";
import type {
  FigureFrame,
  FigureGridDefinition,
  FigureSymbolRuleSet,
  FigureSymbolState,
} from "./types";

const grid: FigureGridDefinition = { rows: 5, columns: 5 };

function symbol(overrides: Partial<FigureSymbolState> = {}): FigureSymbolState {
  return {
    id: "alpha",
    shape: "arrow",
    color: "blue",
    fill: "solid",
    orientation: 0,
    row: 2,
    column: 2,
    ...overrides,
  };
}

function frame(...symbols: FigureSymbolState[]): FigureFrame {
  return { index: 0, symbols };
}

describe("Figure Sequence transformation engine", () => {
  it("translates horizontally and preserves bounce direction between frames", () => {
    const rules: FigureSymbolRuleSet[] = [
      {
        symbolId: "alpha",
        movement: {
          kind: "linear",
          direction: "right",
          steps: 1,
          progression: "fixed",
          boundary: "bounce",
        },
      },
    ];
    const frames = replayFigureSequence(
      grid,
      frame(symbol({ column: 3 })),
      rules,
      4,
    );
    expect(frames.map((item) => item.symbols[0].column)).toEqual([3, 4, 3, 2, 1]);
  });

  it("keeps diagonal motion diagonal when bouncing", () => {
    const rules: FigureSymbolRuleSet[] = [
      {
        symbolId: "alpha",
        movement: {
          kind: "linear",
          direction: "up_right",
          steps: 1,
          progression: "fixed",
          boundary: "bounce",
        },
      },
    ];
    const frames = replayFigureSequence(
      grid,
      frame(symbol({ row: 1, column: 3 })),
      rules,
      3,
    );
    expect(
      frames.map((item) => [item.symbols[0].row, item.symbols[0].column]),
    ).toEqual([
      [1, 3],
      [0, 4],
      [1, 3],
      [2, 2],
    ]);
    expect(frames[2].symbols[0].motionState).toEqual({
      rowDelta: 1,
      columnDelta: -1,
    });
  });

  it("traverses the outer border clockwise and counter-clockwise", () => {
    const clockwise = evolveFigureFrame(
      grid,
      frame(symbol({ row: 0, column: 0 })),
      [
        {
          symbolId: "alpha",
          movement: {
            kind: "border",
            direction: "clockwise",
            steps: 6,
            progression: "fixed",
          },
        },
      ],
      0,
    );
    const counter = evolveFigureFrame(
      grid,
      frame(symbol({ row: 0, column: 0 })),
      [
        {
          symbolId: "alpha",
          movement: {
            kind: "border",
            direction: "counter_clockwise",
            steps: 2,
            progression: "fixed",
          },
        },
      ],
      0,
    );
    expect([clockwise.symbols[0].row, clockwise.symbols[0].column]).toEqual([2, 4]);
    expect([counter.symbols[0].row, counter.symbols[0].column]).toEqual([2, 0]);
  });

  it("applies x+1 movement progression", () => {
    const frames = replayFigureSequence(
      { rows: 3, columns: 8 },
      frame(symbol({ row: 1, column: 0 })),
      [
        {
          symbolId: "alpha",
          movement: {
            kind: "linear",
            direction: "right",
            steps: 1,
            progression: "incrementing",
            boundary: "reject",
          },
        },
      ],
      3,
    );
    expect(frames.map((item) => item.symbols[0].column)).toEqual([0, 1, 3, 6]);
  });

  it("repeats direction cycles", () => {
    const frames = replayFigureSequence(
      grid,
      frame(symbol()),
      [
        {
          symbolId: "alpha",
          movement: {
            kind: "direction_cycle",
            directions: ["left", "up", "right", "down"],
            steps: 1,
            progression: "fixed",
            boundary: "reject",
          },
        },
      ],
      4,
    );
    expect(
      frames.map((item) => [item.symbols[0].row, item.symbols[0].column]),
    ).toEqual([
      [2, 2],
      [2, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ]);
  });

  it("applies fixed and x+1 rotations with colour cycles", () => {
    const frames = replayFigureSequence(
      grid,
      frame(symbol()),
      [
        {
          symbolId: "alpha",
          rotation: {
            direction: "clockwise",
            quarterTurns: 1,
            progression: "incrementing",
          },
          colour: {
            cycle: ["blue", "pink", "yellow"],
            steps: 1,
            progression: "fixed",
          },
        },
      ],
      3,
    );
    expect(frames.map((item) => item.symbols[0].orientation)).toEqual([0, 90, 270, 180]);
    expect(frames.map((item) => item.symbols[0].color)).toEqual([
      "blue",
      "pink",
      "yellow",
      "blue",
    ]);
  });

  it("evolves multiple symbols independently without losing identities", () => {
    const initial = frame(
      symbol({ id: "alpha", row: 1, column: 1 }),
      symbol({ id: "beta", shape: "circle", row: 3, column: 3 }),
    );
    const next = evolveFigureFrame(
      grid,
      initial,
      [
        {
          symbolId: "alpha",
          movement: {
            kind: "linear",
            direction: "right",
            steps: 1,
            progression: "fixed",
            boundary: "reject",
          },
        },
        {
          symbolId: "beta",
          movement: {
            kind: "linear",
            direction: "up",
            steps: 1,
            progression: "fixed",
            boundary: "reject",
          },
        },
      ],
      0,
    );
    expect(next.symbols.map((item) => [item.id, item.row, item.column])).toEqual([
      ["alpha", 1, 2],
      ["beta", 2, 3],
    ]);
  });

  it("rejects boundary exits, collisions, and missing-symbol rules", () => {
    expect(() =>
      evolveFigureFrame(
        grid,
        frame(symbol({ row: 0 })),
        [
          {
            symbolId: "alpha",
            movement: {
              kind: "linear",
              direction: "up",
              steps: 1,
              progression: "fixed",
              boundary: "reject",
            },
          },
        ],
        0,
      ),
    ).toThrow(/outside/);

    expect(() =>
      evolveFigureFrame(
        grid,
        frame(
          symbol({ id: "alpha", row: 2, column: 1 }),
          symbol({ id: "beta", row: 2, column: 3 }),
        ),
        [
          {
            symbolId: "alpha",
            movement: {
              kind: "linear",
              direction: "right",
              steps: 1,
              progression: "fixed",
              boundary: "reject",
            },
          },
          {
            symbolId: "beta",
            movement: {
              kind: "linear",
              direction: "left",
              steps: 1,
              progression: "fixed",
              boundary: "reject",
            },
          },
        ],
        0,
      ),
    ).toThrow(/overlap/);

    expect(() =>
      evolveFigureFrame(
        grid,
        frame(symbol()),
        [{ symbolId: "missing", rotation: { direction: "clockwise", quarterTurns: 1, progression: "fixed" } }],
        0,
      ),
    ).toThrow(/missing symbol/);
  });
});

