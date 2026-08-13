import { describe, expect, it } from "vitest";
import { visibleFrameValue } from "./distractors";
import { calculateFigureDifficulty } from "./difficulty";
import { figureFrameSimilarity } from "./distractors";
import { figureStructuralSignature, fingerprintFigureSequence } from "./fingerprint";
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

  it.each([
    ["easy", 1],
    ["easy", 2],
    ["medium", 2],
    ["medium", 3],
    ["hard", 3],
    ["hard", 4],
  ] as const)("supports an exact %s %i-symbol development profile", (difficulty, symbolCount) => {
    const question = generateValidatedFigureSequence({
      seed: `exact-${difficulty}-${symbolCount}`,
      difficulty,
      symbolCount,
      maxAttempts: 500,
    });
    const metrics = calculateFigureDifficulty(question);
    expect(metrics.difficulty).toBe(difficulty);
    expect(metrics.metrics.symbolCount).toBe(symbolCount);
    expect(metrics.metrics.independentRuleCount).toBe(symbolCount);
  });

  it("weights Medium toward three symbols and Hard regularly toward four", () => {
    const counts = { medium: { 2: 0, 3: 0 }, hard: { 3: 0, 4: 0 } };
    for (let seed = 0; seed < 100; seed += 1) {
      for (const difficulty of ["medium", "hard"] as const) {
        const question = generateValidatedFigureSequence({
          seed: `weight-${difficulty}-${seed}`,
          difficulty,
          maxAttempts: 500,
        });
        const count = question.structuredData.visibleFrames[0].symbols.length;
        counts[difficulty][count as keyof (typeof counts)[typeof difficulty]] += 1;
      }
    }
    expect(counts.medium[3]).toBeGreaterThanOrEqual(70);
    expect(counts.hard[4]).toBeGreaterThanOrEqual(45);
  });

  it.each(["medium", "hard"] as const)("uses independent streams and single-symbol near neighbours for %s", (difficulty) => {
    const question = generateValidatedFigureSequence({ seed: `streams-${difficulty}`, difficulty });
    const count = question.structuredData.visibleFrames[0].symbols.length;
    const metrics = calculateFigureDifficulty(question).metrics;
    expect(metrics.independentRuleCount).toBe(count);
    expect(metrics.orientationRuleCount).toBeGreaterThanOrEqual(1);
    question.sequence.missingMatrices.forEach((matrix, index) => {
      const correct = question.solutionFrames[index];
      matrix.candidates
        .filter((candidate) => candidate.id !== question.correctAnswer[index])
        .forEach((candidate) => {
          expect(figureFrameSimilarity(correct, candidate.frame)).toBe((count - 1) / count);
        });
    });
  });

  it("separates structural diversity from exact semantic fingerprints", () => {
    const candidate = figureSequenceGenerator.generate({ seed: "structure", difficulty: "easy", symbolCount: 1 }, 1);
    const signature = figureStructuralSignature(candidate);
    const fingerprint = fingerprintFigureSequence(candidate);
    candidate.structuredData.visibleFrames[0].symbols[0].row =
      (candidate.structuredData.visibleFrames[0].symbols[0].row + 1) % 5;
    expect(figureStructuralSignature(candidate)).toBe(signature);
    expect(fingerprintFigureSequence(candidate)).not.toBe(fingerprint);
    candidate.structuredData.rules[0].movement!.steps += 1;
    expect(figureStructuralSignature(candidate)).not.toBe(signature);
  });
});
