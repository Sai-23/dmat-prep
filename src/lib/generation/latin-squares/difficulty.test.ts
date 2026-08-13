import { describe, expect, it } from "vitest";

import { analyzeLatinDeductions, calculateLatinDifficulty } from "./difficulty";
import { generateValidatedLatinSquare } from "./pipeline";

describe("Latin-square target difficulty", () => {
  it.each([
    ["easy", "direct", 1, 1, 2],
    ["medium", "indirect", 2, 2, 3],
    ["hard", "multi_stage", 3, 3, 4],
  ] as const)(
    "reproduces the calibrated %s fixture",
    (difficulty, classification, minimumRound, minimumCandidates, maximumCandidates) => {
      const configuration = {
        seed: `latin-calibrated-fixture-${difficulty}`,
        difficulty,
        maxAttempts: 5_000,
      } as const;
      const first = generateValidatedLatinSquare(configuration);
      const second = generateValidatedLatinSquare(configuration);
      expect(second.structuredData).toEqual(first.structuredData);
      expect(second.correctAnswer).toBe(first.correctAnswer);
      expect(second.deductionTrace).toEqual(first.deductionTrace);
      expect(second.metadata.attemptCount).toBe(first.metadata.attemptCount);
      expect(second.metadata.fingerprint).toBe(first.metadata.fingerprint);

      const analysis = analyzeLatinDeductions(first);
      const calculated = calculateLatinDifficulty(first, analysis);
      expect(calculated?.difficulty).toBe(difficulty);
      expect(calculated?.metrics.classification).toBe(classification);
      expect(calculated?.metrics.targetRound).toBeGreaterThanOrEqual(minimumRound);
      expect(calculated?.metrics.targetInitialCandidateCount).toBeGreaterThanOrEqual(minimumCandidates);
      expect(calculated?.metrics.targetInitialCandidateCount).toBeLessThanOrEqual(maximumCandidates);
      if (difficulty === "medium") {
        expect(calculated?.metrics.forcedPlacementsBeforeTarget).toBeGreaterThanOrEqual(1);
      }
      if (difficulty === "hard") {
        expect(calculated?.metrics.forcedPlacementsBeforeTarget).toBeGreaterThanOrEqual(4);
        expect(
          (calculated?.metrics.rowDependencyCount ?? 0) +
          (calculated?.metrics.columnDependencyCount ?? 0),
        ).toBeGreaterThan(0);
      }
    },
    30_000,
  );
});
