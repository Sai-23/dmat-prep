import { describe, expect, it } from "vitest";

import { fingerprintMathematicalEquation } from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";
import {
  generateValidatedMathematicalEquation,
  MathematicalEquationGenerationError,
} from "./pipeline";

describe("validated mathematical-equation pipeline", () => {
  it("adds complete acceptance metadata and checks", () => {
    const question = generateValidatedMathematicalEquation({
      seed: "accepted",
      difficulty: "medium",
    });
    expect(question.metadata).toMatchObject({
      seed: "accepted",
      requestedDifficulty: "medium",
      calculatedDifficulty: "medium",
      attemptCount: 1,
    });
    expect(question.metadata.generatorVersion).toMatch(/^mathematical-equations@/);
    expect(question.metadata.validatorVersion).toMatch(/^mathematical-equations-validator@/);
    expect(question.metadata.fingerprint).toMatch(/^mathematical-equation:v1:/);
    expect(question.validation.valid).toBe(true);
    expect(question.validation.checks.every((check) => check.passed)).toBe(true);
    expect(question.validation.checks.at(-1)?.stage).toBe("duplicate");
  });

  it("retries a duplicate semantic fingerprint", () => {
    const configuration = { seed: "duplicate-retry", difficulty: "hard" as const };
    const firstCandidate = mathematicalEquationGenerator.generate(configuration, 1);
    const firstFingerprint = fingerprintMathematicalEquation(firstCandidate);
    const question = generateValidatedMathematicalEquation(
      configuration,
      new Set([firstFingerprint]),
    );
    expect(question.metadata.attemptCount).toBe(2);
    expect(question.metadata.fingerprint).not.toBe(firstFingerprint);
  });

  it("fails clearly when bounded attempts are exhausted", () => {
    const configuration = {
      seed: "duplicate-failure",
      difficulty: "easy" as const,
      maxAttempts: 1,
    };
    const fingerprint = fingerprintMathematicalEquation(
      mathematicalEquationGenerator.generate(configuration, 1),
    );
    expect(() =>
      generateValidatedMathematicalEquation(configuration, new Set([fingerprint])),
    ).toThrow(MathematicalEquationGenerationError);
  });

  it("rejects unbounded attempt configurations", () => {
    expect(() =>
      generateValidatedMathematicalEquation({
        seed: "attempts",
        difficulty: "easy",
        maxAttempts: 101,
      }),
    ).toThrow(RangeError);
  });
});

