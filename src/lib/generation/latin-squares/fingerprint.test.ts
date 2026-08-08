import { describe, expect, it } from "vitest";

import { fingerprintLatinSquare } from "./fingerprint";
import { latinSquareGenerator } from "./generator";
import type { LatinSymbol } from "./types";

describe("Latin-square fingerprints", () => {
  it("normalizes safe symbol relabeling", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "latin-fingerprint", difficulty: "medium" },
      1,
    );
    const relabeled = structuredClone(candidate);
    const map: Record<LatinSymbol, LatinSymbol> = {
      A: "C",
      B: "E",
      C: "A",
      D: "B",
      E: "D",
    };
    relabeled.structuredData.grid = relabeled.structuredData.grid.map((row) =>
      row.map((symbol) => (symbol === null ? null : map[symbol])),
    );
    relabeled.correctAnswer = map[relabeled.correctAnswer];
    expect(fingerprintLatinSquare(relabeled)).toBe(fingerprintLatinSquare(candidate));
  });

  it("changes when the target coordinate changes", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "latin-fingerprint-target", difficulty: "easy" },
      1,
    );
    const changed = structuredClone(candidate);
    changed.structuredData.target = {
      row: (candidate.structuredData.target.row + 1) % 5,
      column: candidate.structuredData.target.column,
    };
    expect(fingerprintLatinSquare(changed)).not.toBe(fingerprintLatinSquare(candidate));
  });
});
