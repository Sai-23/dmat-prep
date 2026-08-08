import { describe, expect, it } from "vitest";

import { latinSquareGenerator } from "./generator";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  type CompletedLatinGrid,
} from "./types";

function expectCompletedLatinSquare(grid: CompletedLatinGrid): void {
  const expected = [...DEFAULT_LATIN_SYMBOLS].sort();
  expect(grid).toHaveLength(LATIN_SQUARE_SIZE);
  for (const row of grid) {
    expect(row).toHaveLength(LATIN_SQUARE_SIZE);
    expect([...row].sort()).toEqual(expected);
  }
  for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
    expect(grid.map((row) => row[column]).sort()).toEqual(expected);
  }
}

describe("LatinSquareGenerator", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "is deterministic for %s configuration",
    (difficulty) => {
      const configuration = { seed: "latin-deterministic", difficulty };
      expect(latinSquareGenerator.generate(configuration, 1)).toEqual(
        latinSquareGenerator.generate(configuration, 1),
      );
    },
  );

  it.each([
    ["easy", 14, 17],
    ["medium", 10, 13],
    ["hard", 7, 9],
  ] as const)(
    "constructs valid %s completed squares with provisional clue budgets",
    (difficulty, minimumClues, maximumClues) => {
      for (let seed = 0; seed < 250; seed += 1) {
        const candidate = latinSquareGenerator.generate(
          { seed: `latin-${seed}`, difficulty },
          1,
        );
        expectCompletedLatinSquare(candidate.completedGrid);
        expect(candidate.structuredData.grid).toHaveLength(5);
        expect(candidate.structuredData.grid.every((row) => row.length === 5)).toBe(true);
        const { row, column } = candidate.structuredData.target;
        expect(candidate.structuredData.grid[row][column]).toBeNull();
        expect(candidate.correctAnswer).toBe(candidate.completedGrid[row][column]);
        const clueCount = candidate.structuredData.grid.flat().filter(Boolean).length;
        expect(clueCount).toBeGreaterThanOrEqual(minimumClues);
        expect(clueCount).toBeLessThanOrEqual(maximumClues);
        expect(candidate.response.kind).toBe("single_choice");
        if (candidate.response.kind === "single_choice") {
          expect(candidate.response.options.map((option) => option.content)).toEqual(
            DEFAULT_LATIN_SYMBOLS,
          );
        }
        for (let index = 0; index < LATIN_SQUARE_SIZE; index += 1) {
          expect(candidate.structuredData.grid[index].some(Boolean)).toBe(true);
          expect(candidate.structuredData.grid.some((gridRow) => Boolean(gridRow[index]))).toBe(true);
        }
      }
    },
  );

  it("uses the attempt as part of deterministic retry generation", () => {
    const configuration = { seed: "latin-retry", difficulty: "hard" as const };
    expect(latinSquareGenerator.generate(configuration, 1)).not.toEqual(
      latinSquareGenerator.generate(configuration, 2),
    );
  });

  it("rejects empty seeds and invalid attempts", () => {
    expect(() =>
      latinSquareGenerator.generate({ seed: " ", difficulty: "easy" }, 1),
    ).toThrow(/non-empty/);
    expect(() =>
      latinSquareGenerator.generate({ seed: "latin", difficulty: "easy" }, 0),
    ).toThrow(RangeError);
  });
});

