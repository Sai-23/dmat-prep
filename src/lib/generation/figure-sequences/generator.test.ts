import { describe, expect, it } from "vitest";
import { visibleFrameValue } from "./distractors";
import { fingerprintFigureSequence } from "./fingerprint";
import { figureSequenceGenerator } from "./generator";
import { generateValidatedFigureSequence, reproduceValidatedFigureSequence } from "./pipeline";
import { figureSequenceValidator } from "./validator";

describe("figure sequence generation", () => {
  it.each(["easy", "medium", "hard"] as const)("is deterministic for %s", (difficulty) => {
    const configuration = { seed: `determinism-${difficulty}`, difficulty, maxAttempts: 500 };
    const first = generateValidatedFigureSequence(configuration);
    const reproduced = reproduceValidatedFigureSequence(configuration, first.metadata.attemptCount);
    expect(reproduced.structuredData).toEqual(first.structuredData);
    expect(reproduced.sequence).toEqual(first.sequence);
    expect(reproduced.correctAnswer).toEqual(first.correctAnswer);
    expect(reproduced.metadata.fingerprint).toBe(first.metadata.fingerprint);
  });

  it.each(["easy", "medium", "hard"] as const)("builds validated native two-stage choices for %s", (difficulty) => {
    for (let seed = 0; seed < 30; seed += 1) {
      const question = generateValidatedFigureSequence({ seed: `${difficulty}-${seed}`, difficulty, maxAttempts: 500 });
      expect(question.validation.checks.every((check) => check.passed)).toBe(true);
      expect(question.response.kind).toBe("two_stage_single_choice");
      expect(question.sequence.missingMatrices).toHaveLength(2);
      question.sequence.missingMatrices.forEach((matrix, index) => {
        expect(matrix.candidates).toHaveLength(3);
        expect(new Set(matrix.candidates.map((candidate) => visibleFrameValue(candidate.frame))).size).toBe(3);
        expect(matrix.candidates.filter((candidate) => candidate.id === question.correctAnswer[index])).toHaveLength(1);
      });
    }
  });

  it("rejects a changed visible frame", () => {
    const candidate = figureSequenceGenerator.generate({ seed: "tamper-visible", difficulty: "easy" }, 1);
    candidate.structuredData.visibleFrames[1].symbols[0].color = "green";
    expect(figureSequenceValidator.validate(candidate, "easy")).toMatchObject({ valid: false });
  });

  it("rejects duplicate distractors and a wrong answer key", () => {
    const candidate = figureSequenceGenerator.generate({ seed: "tamper-options", difficulty: "easy" }, 1);
    candidate.sequence.missingMatrices[0].candidates[1].frame = structuredClone(candidate.sequence.missingMatrices[0].candidates[0].frame);
    candidate.correctAnswer[1] = "not-an-option";
    expect(figureSequenceValidator.validate(candidate, "easy")).toMatchObject({ valid: false });
  });

  it("rejects an incorrect requested difficulty", () => {
    const question = generateValidatedFigureSequence({ seed: "wrong-difficulty", difficulty: "easy" });
    const candidate = figureSequenceGenerator.generate({ seed: "wrong-difficulty", difficulty: "easy" }, question.metadata.attemptCount);
    expect(figureSequenceValidator.validate(candidate, "hard")).toMatchObject({ valid: false });
  });

  it("fingerprints semantics, not prose or candidate labels", () => {
    const candidate = figureSequenceGenerator.generate({ seed: "fingerprint", difficulty: "easy" }, 1);
    const original = fingerprintFigureSequence(candidate);
    candidate.presentation.prompt = "Different wording";
    candidate.sequence.missingMatrices[0].candidates[0].label = "Z";
    expect(fingerprintFigureSequence(candidate)).toBe(original);
    candidate.structuredData.rules[0].movement!.steps += 1;
    expect(fingerprintFigureSequence(candidate)).not.toBe(original);
  });

  it("skips an already accepted semantic fingerprint", () => {
    const configuration = { seed: "deduplicate", difficulty: "medium" as const, maxAttempts: 500 };
    const first = generateValidatedFigureSequence(configuration);
    const second = generateValidatedFigureSequence(configuration, new Set([first.metadata.fingerprint]));
    expect(second.metadata.attemptCount).toBeGreaterThan(first.metadata.attemptCount);
    expect(second.metadata.fingerprint).not.toBe(first.metadata.fingerprint);
  });
});
