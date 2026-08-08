import { describe, expect, it } from "vitest";

import { mathematicalEquationGenerator } from "./generator";
import { mathematicalEquationValidator } from "./validator";

describe("MathematicalEquationValidator", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "accepts independently verified %s candidates",
    (difficulty) => {
      for (let seed = 0; seed < 200; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate(
          { seed: `validator-${seed}`, difficulty },
          1,
        );
        const result = mathematicalEquationValidator.validate(candidate, difficulty);
        expect(result.valid, result.valid ? undefined : JSON.stringify(result.issues)).toBe(true);
        if (result.valid) {
          expect(result.solution.assignment).toEqual(candidate.correctAnswer);
          expect(result.solution.calculatedDifficulty).toBe(difficulty);
        }
      }
    },
  );

  it("rejects an incorrect stored answer", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "wrong-answer", difficulty: "easy" },
      1,
    );
    candidate.correctAnswer.A = candidate.correctAnswer.A === 20 ? 19 : 20;
    const result = mathematicalEquationValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].code).toBe("stored_answer_mismatch");
  });

  it("rejects ambiguity rather than trusting construction", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "ambiguous", difficulty: "easy" },
      1,
    );
    candidate.structuredData.equations[1] = candidate.structuredData.equations[0];
    const result = mathematicalEquationValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((item) => item.code === "multiple_solutions")).toBe(true);
  });

  it("rejects division by zero structurally", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "zero", difficulty: "easy" },
      1,
    );
    candidate.structuredData.equations[0] = {
      left: {
        kind: "operation",
        operator: "divide",
        left: { kind: "variable", symbol: "A" },
        right: { kind: "constant", value: 0 },
      },
      right: { kind: "constant", value: 1 },
    };
    const result = mathematicalEquationValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((item) => item.code === "invalid_divisor")).toBe(true);
  });

  it("rejects a solution explanation that does not reproduce its result", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "explanation", difficulty: "medium" },
      1,
    );
    candidate.solutionPath[1].knownSymbols = [];
    const result = mathematicalEquationValidator.validate(candidate, "medium");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].stage).toBe("explanation");
  });

  it("rejects requested and calculated difficulty mismatch", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "difficulty", difficulty: "easy" },
      1,
    );
    const result = mathematicalEquationValidator.validate(candidate, "hard");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].code).toBe("difficulty_mismatch");
  });
});

