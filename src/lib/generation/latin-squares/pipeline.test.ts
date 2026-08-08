import { describe, expect, it } from "vitest";

import { fingerprintLatinSquare } from "./fingerprint";
import { generateValidatedLatinSquare } from "./pipeline";

describe("validated Latin-square pipeline", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "generates independently accepted %s questions",
    (difficulty) => {
      const question = generateValidatedLatinSquare({
        seed: `pipeline-${difficulty}`,
        difficulty,
      });
      expect(question.metadata.requestedDifficulty).toBe(difficulty);
      expect(question.metadata.calculatedDifficulty).toBe(difficulty);
      expect(question.validation.checks.every((check) => check.passed)).toBe(true);
      expect(question.deductionTrace.length).toBeGreaterThan(0);
      expect(question.explanation).toContain(`Put ${question.correctAnswer}`);
    },
    30_000,
  );

  it.each(["easy", "medium", "hard"] as const)(
    "maintains target uniqueness and logical difficulty across %s seeds",
    (difficulty) => {
      for (let index = 0; index < 100; index += 1) {
        const question = generateValidatedLatinSquare({
          seed: `g7-${difficulty}-${index}`,
          difficulty,
        });
        expect(question.validation.checks.every((check) => check.passed)).toBe(true);
        expect(question.metadata.calculatedDifficulty).toBe(difficulty);
        const targetDeduction = question.deductionTrace.find(
          (deduction) =>
            deduction.coordinate.row === question.structuredData.target.row &&
            deduction.coordinate.column === question.structuredData.target.column,
        );
        expect(targetDeduction?.symbol).toBe(question.correctAnswer);
      }
    },
    30_000,
  );

  it("retries a duplicate semantic clue structure", () => {
    const configuration = { seed: "latin-duplicate", difficulty: "medium" as const };
    const first = generateValidatedLatinSquare(configuration);
    const second = generateValidatedLatinSquare(
      configuration,
      new Set([fingerprintLatinSquare(first)]),
    );
    expect(second.metadata.attemptCount).toBeGreaterThan(first.metadata.attemptCount);
    expect(second.metadata.fingerprint).not.toBe(first.metadata.fingerprint);
  });
});
