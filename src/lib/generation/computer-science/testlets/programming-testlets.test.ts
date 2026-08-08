import { describe, expect, it } from "vitest";
import { generateProgrammingSubjectTestlet, generateValidatedProgrammingSubjectTestlet, reproduceValidatedProgrammingSubjectTestlet, simulateProgrammingTrace } from "./programming-testlets";
import { validateSubjectTestlet } from "./validation";

describe("CS3 deterministic Programming testlets", () => {
  it("simulates mutation, branching, accumulation, and update count exactly", () => {
    expect(simulateProgrammingTrace({ values: [2, 3, 4, 5], divisor: 2, increment: 1 })).toEqual({
      finalArray: [3, 3, 5, 5], finalTotal: 0, updates: 2,
      steps: [
        { index: 0, inputValue: 2, branch: "divisible", array: [3, 3, 4, 5], total: 3, updates: 1 },
        { index: 1, inputValue: 3, branch: "other", array: [3, 3, 4, 5], total: 0, updates: 1 },
        { index: 2, inputValue: 4, branch: "divisible", array: [3, 3, 5, 5], total: 5, updates: 2 },
        { index: 3, inputValue: 5, branch: "other", array: [3, 3, 5, 5], total: 0, updates: 2 },
      ],
    });
  });

  it.each([["easy", 4], ["medium", 6], ["hard", 8]] as const)("generates 100 validated %s testlets with %i diverse children", (difficulty, size) => {
    for (let index = 0; index < 100; index += 1) {
      const testlet = generateProgrammingSubjectTestlet({ seed: `${difficulty}-${index}`, difficulty });
      expect(testlet.module).toBe("programming");
      expect(testlet.questions).toHaveLength(size);
      expect(validateSubjectTestlet(testlet).valid).toBe(true);
      expect(new Set(testlet.questions.map((question) => question.reasoningRole)).size).toBe(size);
      expect(testlet.questions.every((question) => question.options.length === 4 && question.validation.verifiedCorrectOptionId === question.correctOptionId)).toBe(true);
    }
  });

  it.each([4, 5, 6, 7, 8] as const)("supports explicit %i-question testlets", (targetSize) => {
    expect(generateProgrammingSubjectTestlet({ seed: `size-${targetSize}`, difficulty: "hard", targetSize }).questions).toHaveLength(targetSize);
  });

  it("reproduces and deduplicates complete testlets", () => {
    const configuration = { seed: "programming-pipeline", difficulty: "medium" as const };
    const first = generateValidatedProgrammingSubjectTestlet(configuration);
    const replay = reproduceValidatedProgrammingSubjectTestlet(configuration, first.metadata.attemptCount);
    const next = generateValidatedProgrammingSubjectTestlet(configuration, new Set([first.metadata.fingerprint]));
    expect(replay.metadata.fingerprint).toBe(first.metadata.fingerprint);
    expect(replay.testlet).toEqual(first.testlet);
    expect(next.metadata.fingerprint).not.toBe(first.metadata.fingerprint);
    expect(next.metadata.attemptCount).toBeGreaterThan(first.metadata.attemptCount);
  });

  it("delivers pseudocode and semantic input state without exposing solver data", () => {
    const unit = generateValidatedProgrammingSubjectTestlet({ seed: "delivery", difficulty: "easy" });
    expect(unit.family).toBe("programming_testlet");
    expect(unit.stimulus.blocks.some((block) => block.kind === "code")).toBe(true);
    expect(unit.stimulus.blocks.some((block) => block.kind === "table")).toBe(true);
    expect(JSON.stringify(unit.stimulus)).not.toContain("correctOptionId");
    expect(JSON.stringify(unit.stimulus)).not.toContain("verifiedCorrectOptionId");
  });
});
