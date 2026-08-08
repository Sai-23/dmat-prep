import { describe, expect, it } from "vitest";

import {
  evaluateCombinationalCircuit,
  fingerprintCombinationalCircuit,
  generateCombinationalCircuitCandidate,
  generateValidatedCombinationalCircuitUnit,
  reproduceValidatedCombinationalCircuitUnit,
  solveCombinationalCircuit,
  validateCombinationalCircuit,
} from "./combinational-circuits";

describe("deterministic combinational-circuit family", () => {
  it.each(["easy", "medium", "hard"] as const)("generates and independently validates 100 %s seeds", (difficulty) => {
    for (let seed = 0; seed < 100; seed += 1) {
      const unit = generateValidatedCombinationalCircuitUnit({ seed: `${difficulty}-${seed}`, difficulty });
      expect(unit.validation.checks.every((check) => check.passed)).toBe(true);
      expect(unit.questions).toHaveLength(2);
      expect(unit.questions.every((question) => question.options.length === 4)).toBe(true);
      expect(solveCombinationalCircuit(unit).correctOptionIds).toEqual(unit.questions.map((question) => question.correctOptionId));
      expect(unit.metadata.calculatedDifficulty).toBe(difficulty);
    }
  });

  it.each(["easy", "medium", "hard"] as const)("reproduces %s output from seed and accepted attempt", (difficulty) => {
    const configuration = { seed: `reproduce-${difficulty}`, difficulty };
    const first = generateValidatedCombinationalCircuitUnit(configuration);
    const replay = reproduceValidatedCombinationalCircuitUnit(configuration, first.metadata.attemptCount);
    expect(replay.structuredData).toEqual(first.structuredData);
    expect(replay.questions).toEqual(first.questions);
    expect(replay.metadata.fingerprint).toBe(first.metadata.fingerprint);
  });

  it("evaluates gates in dependency order", () => {
    const candidate = generateCombinationalCircuitCandidate({ seed: "evaluate", difficulty: "easy" }, 1);
    const result = evaluateCombinationalCircuit(candidate, { A: true, B: false });
    expect(result.signature).toMatch(/^[TF]{2}$/);
    expect(result.values.G1).toBe(!result.values.G2);
  });

  it("rejects a tampered stored answer", () => {
    const candidate = generateCombinationalCircuitCandidate({ seed: "answer", difficulty: "medium" }, 1);
    candidate.questions[0].correctOptionId = candidate.questions[0].options.find((option) => option.id !== candidate.questions[0].correctOptionId)!.id;
    expect(validateCombinationalCircuit(candidate, "medium").valid).toBe(false);
  });

  it("rejects a forward gate reference", () => {
    const candidate = generateCombinationalCircuitCandidate({ seed: "forward", difficulty: "hard" }, 1);
    candidate.structuredData.gates[0].inputs[0] = "G6";
    expect(validateCombinationalCircuit(candidate, "hard").valid).toBe(false);
  });

  it("rejects duplicate answer signatures", () => {
    const candidate = generateCombinationalCircuitCandidate({ seed: "duplicates", difficulty: "easy" }, 1);
    candidate.questions[0].options[1].content = candidate.questions[0].options[0].content;
    expect(validateCombinationalCircuit(candidate, "easy").valid).toBe(false);
  });

  it("fingerprints circuit semantics rather than wording", () => {
    const candidate = generateCombinationalCircuitCandidate({ seed: "fingerprint", difficulty: "medium" }, 1);
    const fingerprint = fingerprintCombinationalCircuit(candidate);
    candidate.stimulus.title = "Changed title";
    candidate.questions[0].prompt = "Changed prompt";
    expect(fingerprintCombinationalCircuit(candidate)).toBe(fingerprint);
    candidate.structuredData.gates[0].operator = candidate.structuredData.gates[0].operator === "and" ? "or" : "and";
    expect(fingerprintCombinationalCircuit(candidate)).not.toBe(fingerprint);
  });

  it("skips an accepted semantic duplicate", () => {
    const configuration = { seed: "dedupe", difficulty: "medium" as const };
    const first = generateValidatedCombinationalCircuitUnit(configuration);
    const next = generateValidatedCombinationalCircuitUnit(configuration, new Set([first.metadata.fingerprint]));
    expect(next.metadata.attemptCount).toBeGreaterThan(first.metadata.attemptCount);
    expect(next.metadata.fingerprint).not.toBe(first.metadata.fingerprint);
  });
});
