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
        expect(
          result.valid,
          result.valid
            ? undefined
            : `${difficulty}/${seed}/${candidate.structuredData.dependencyModel.family}: ${JSON.stringify(result.issues)} ${JSON.stringify(result.checks.at(-1)?.details)}`,
        ).toBe(true);
        if (result.valid) {
          expect(result.solution.assignment).toEqual(candidate.correctAnswer);
          expect(result.solution.calculatedDifficulty).toBe(difficulty);
        }
      }
    },
    15_000,
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
    if (!result.valid) {
      expect(result.issues.some((item) =>
        item.code === "multiple_solutions" || item.code === "redundant_equation",
      )).toBe(true);
    }
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

  it("requires both equations for an indirect first deduction", () => {
    let candidate = mathematicalEquationGenerator.generate(
      { seed: "indirect-trace", difficulty: "hard" },
      1,
    );
    for (let attempt = 2; !candidate.solutionPath.some((step) => step.reasoning === "combine_equations"); attempt += 1) {
      candidate = mathematicalEquationGenerator.generate(
        { seed: "indirect-trace", difficulty: "hard" },
        attempt,
      );
    }
    const combineStep = candidate.solutionPath.find((step) => step.reasoning === "combine_equations");
    expect(combineStep?.supportingEquationIndices?.length).toBeGreaterThanOrEqual(1);
    combineStep!.supportingEquationIndices = [];
    const result = mathematicalEquationValidator.validate(candidate, "hard");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((item) =>
        item.code === "non_deductive_step" || item.code === "missing_supporting_equation",
      )).toBe(true);
    }
  });

  it("rejects dependency metadata that disagrees with the verified solve path", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "dependency-model", difficulty: "hard" },
      1,
    );
    candidate.structuredData.dependencyModel.edges = [];
    const result = mathematicalEquationValidator.validate(candidate, "hard");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((item) => item.code === "dependency_model_mismatch")).toBe(true);
    }
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
