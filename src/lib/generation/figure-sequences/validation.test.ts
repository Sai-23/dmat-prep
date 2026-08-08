import { describe, expect, it } from "vitest";

import { validateFigureFrameStructure } from "./validation";
import { FIGURE_RENDERER_FIXTURE } from "./fixtures";
import type { FigureFrame } from "./types";

const validFrame: FigureFrame = {
  index: 0,
  symbols: [
    {
      id: "alpha",
      shape: "arrow",
      color: "blue",
      fill: "solid",
      orientation: 90,
      row: 1,
      column: 2,
    },
  ],
};

describe("figure frame structural validation", () => {
  it("accepts a bounded structural frame", () => {
    expect(validateFigureFrameStructure({ rows: 4, columns: 4 }, validFrame)).toEqual({
      valid: true,
    });
  });

  it("rejects figures outside the matrix", () => {
    const frame = structuredClone(validFrame);
    frame.symbols[0].row = 4;
    const result = validateFigureFrameStructure({ rows: 4, columns: 4 }, frame);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.join(" ")).toMatch(/outside/);
  });

  it("rejects overlapping figures and duplicate identities", () => {
    const frame = structuredClone(validFrame);
    frame.symbols.push({ ...frame.symbols[0] });
    const result = validateFigureFrameStructure({ rows: 4, columns: 4 }, frame);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.join(" ")).toMatch(/unique/);
      expect(result.issues.join(" ")).toMatch(/overlap/);
    }
  });

  it("keeps every renderer fixture matrix structurally valid", () => {
    const frames = [
      ...FIGURE_RENDERER_FIXTURE.visibleFrames,
      ...FIGURE_RENDERER_FIXTURE.missingMatrices.flatMap((missing) =>
        missing.candidates.map((candidate) => candidate.frame),
      ),
    ];
    for (const frame of frames) {
      expect(
        validateFigureFrameStructure(FIGURE_RENDERER_FIXTURE.grid, frame),
      ).toEqual({ valid: true });
    }
  });
});
