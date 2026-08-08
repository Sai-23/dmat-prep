import { describe, expect, it } from "vitest";

import {
  fingerprintBooleanLogic,
  generateBooleanLogicCandidate,
  generateValidatedBooleanLogicUnit,
  reproduceValidatedBooleanLogicUnit,
  solveBooleanLogic,
  validateBooleanLogic,
} from "./boolean-logic";

describe("deterministic Boolean truth-table family", () => {
  it.each(["easy", "medium", "hard"] as const)("generates and independently validates 100 %s seeds", (difficulty) => {
    for (let seed = 0; seed < 100; seed += 1) {
      const unit = generateValidatedBooleanLogicUnit({ seed: `${difficulty}-${seed}`, difficulty });
      expect(unit.validation.checks.every((check) => check.passed)).toBe(true);
      expect(unit.questions).toHaveLength(2);
      expect(unit.questions.every((question) => question.options.length === 4)).toBe(true);
      expect(solveBooleanLogic(unit).correctOptionIds).toEqual(unit.questions.map((question) => question.correctOptionId));
      expect(unit.metadata.calculatedDifficulty).toBe(difficulty);
    }
  });

  it.each(["easy", "medium", "hard"] as const)("reproduces %s output from seed and accepted attempt", (difficulty) => {
    const configuration = { seed: `reproduce-${difficulty}`, difficulty };
    const first = generateValidatedBooleanLogicUnit(configuration);
    const second = reproduceValidatedBooleanLogicUnit(configuration, first.metadata.attemptCount);
    expect(second.structuredData).toEqual(first.structuredData);
    expect(second.questions).toEqual(first.questions);
    expect(second.metadata.fingerprint).toBe(first.metadata.fingerprint);
  });

  it("rejects a tampered stored answer", () => {
    const candidate = generateBooleanLogicCandidate({ seed: "tamper-answer", difficulty: "easy" }, 1);
    candidate.questions[0].correctOptionId = candidate.questions[0].options.find((option) => option.id !== candidate.questions[0].correctOptionId)!.id;
    expect(validateBooleanLogic(candidate, "easy")).toMatchObject({ valid: false });
  });

  it("rejects duplicate or missing computed output choices", () => {
    const candidate = generateBooleanLogicCandidate({ seed: "tamper-options", difficulty: "medium" }, 1);
    candidate.questions[0].options[1].content = candidate.questions[0].options[0].content;
    expect(validateBooleanLogic(candidate, "medium")).toMatchObject({ valid: false });
  });

  it("rejects a requested difficulty that differs from calculated work", () => {
    const candidate = generateBooleanLogicCandidate({ seed: "tamper-difficulty", difficulty: "easy" }, 1);
    expect(validateBooleanLogic(candidate, "hard")).toMatchObject({ valid: false });
  });

  it("fingerprints expression semantics rather than wording and IDs", () => {
    const candidate = generateBooleanLogicCandidate({ seed: "semantic", difficulty: "hard" }, 1);
    const original = fingerprintBooleanLogic(candidate);
    candidate.stimulus.title = "Different title";
    candidate.questions[0].prompt = "Different prompt";
    candidate.questions[0].id = "renamed";
    expect(fingerprintBooleanLogic(candidate)).toBe(original);
    const expression = candidate.structuredData.expressions[0].expression;
    if (expression.kind === "binary") expression.operator = expression.operator === "and" ? "or" : "and";
    expect(fingerprintBooleanLogic(candidate)).not.toBe(original);
  });

  it("skips an accepted semantic duplicate", () => {
    const configuration = { seed: "dedupe-boolean", difficulty: "easy" as const };
    const first = generateValidatedBooleanLogicUnit(configuration);
    const next = generateValidatedBooleanLogicUnit(configuration, new Set([first.metadata.fingerprint]));
    expect(next.metadata.attemptCount).toBeGreaterThan(first.metadata.attemptCount);
    expect(next.metadata.fingerprint).not.toBe(first.metadata.fingerprint);
  });
});
