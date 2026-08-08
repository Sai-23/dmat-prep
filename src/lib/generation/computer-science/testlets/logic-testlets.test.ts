import { describe, expect, it } from "vitest";
import { generateBooleanSubjectTestlet, generateCircuitSubjectTestlet, generateValidatedBooleanSubjectTestlet, generateValidatedCircuitSubjectTestlet, reproduceValidatedBooleanSubjectTestlet } from "./logic-testlets";
import { validateSubjectTestlet } from "./validation";

const sizes = { easy: 4, medium: 6, hard: 8 } as const;

describe("CS2 Boolean and combinational testlet adapters", () => {
  it.each(["easy", "medium", "hard"] as const)("generates validated Boolean %s testlets across 100 seeds", (difficulty) => {
    for (let index = 0; index < 100; index += 1) {
      const testlet = generateBooleanSubjectTestlet({ seed: `boolean-${difficulty}-${index}`, difficulty });
      expect(testlet.questions).toHaveLength(sizes[difficulty]);
      expect(validateSubjectTestlet(testlet).valid).toBe(true);
      expect(testlet.questions.every((question) => question.options.length === 4)).toBe(true);
      expect(new Set(testlet.questions.map((question) => question.reasoningRole)).size).toBe(testlet.questions.length);
    }
  });

  it.each(["easy", "medium", "hard"] as const)("generates validated circuit %s testlets across 100 seeds", (difficulty) => {
    for (let index = 0; index < 100; index += 1) {
      const testlet = generateCircuitSubjectTestlet({ seed: `circuit-${difficulty}-${index}`, difficulty });
      expect(testlet.questions).toHaveLength(sizes[difficulty]);
      expect(validateSubjectTestlet(testlet).valid).toBe(true);
      expect(testlet.questions.every((question) => question.validation.verifiedCorrectOptionId === question.correctOptionId)).toBe(true);
    }
  });

  it.each([4, 5, 6, 7, 8] as const)("honors an explicit target size of %i", (targetSize) => {
    expect(generateBooleanSubjectTestlet({ seed: `size-${targetSize}`, difficulty: "hard", targetSize }).questions).toHaveLength(targetSize);
    expect(generateCircuitSubjectTestlet({ seed: `circuit-size-${targetSize}`, difficulty: "hard", targetSize }).questions).toHaveLength(targetSize);
  });

  it("is exactly reproducible from seed, version, configuration, and attempt", () => {
    const configuration = { seed: "reproducible", difficulty: "medium" as const, targetSize: 5 as const };
    expect(generateBooleanSubjectTestlet(configuration, 3)).toEqual(generateBooleanSubjectTestlet(configuration, 3));
    expect(generateCircuitSubjectTestlet(configuration, 2)).toEqual(generateCircuitSubjectTestlet(configuration, 2));
  });

  it("produces a different semantic fingerprint when the seed changes", () => {
    expect(generateBooleanSubjectTestlet({ seed: "first", difficulty: "hard" }).metadata.fingerprint).not.toBe(generateBooleanSubjectTestlet({ seed: "second", difficulty: "hard" }).metadata.fingerprint);
    expect(generateCircuitSubjectTestlet({ seed: "first", difficulty: "hard" }).metadata.fingerprint).not.toBe(generateCircuitSubjectTestlet({ seed: "second", difficulty: "hard" }).metadata.fingerprint);
  });

  it("adapts strict testlets to shared-stimulus Practice and Mock delivery", () => {
    const unit = generateValidatedCircuitSubjectTestlet({ seed: "delivery", difficulty: "medium" });
    expect(unit.family).toBe("circuit_testlet");
    expect(unit.questions).toHaveLength(6);
    expect(unit.stimulus.blocks.some((block) => block.kind === "diagram")).toBe(true);
    expect(unit.validation.checks.every((check) => check.passed)).toBe(true);
    expect(unit.testlet.metadata.childFingerprints).toHaveLength(6);
  });

  it("deduplicates at testlet level and reproduces the accepted attempt", () => {
    const configuration = { seed: "pipeline", difficulty: "easy" as const };
    const first = generateValidatedBooleanSubjectTestlet(configuration);
    const next = generateValidatedBooleanSubjectTestlet(configuration, new Set([first.metadata.fingerprint]));
    expect(next.metadata.attemptCount).toBeGreaterThan(first.metadata.attemptCount);
    expect(next.metadata.fingerprint).not.toBe(first.metadata.fingerprint);
    expect(reproduceValidatedBooleanSubjectTestlet(configuration, first.metadata.attemptCount).metadata.fingerprint).toBe(first.metadata.fingerprint);
  });
});
