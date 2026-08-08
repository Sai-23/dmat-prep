import { describe, expect, it } from "vitest";

import type { MathematicalExpression, VariableAssignment } from "./types";
import { mathematicalEquationGenerator } from "./generator";

function evaluate(expression: MathematicalExpression, values: VariableAssignment): number {
  if (expression.kind === "constant") return expression.value;
  if (expression.kind === "variable") return values[expression.symbol];
  const left = evaluate(expression.left, values);
  const right = evaluate(expression.right, values);
  if (expression.operator === "add") return left + right;
  if (expression.operator === "subtract") return left - right;
  if (expression.operator === "multiply") return left * right;
  return left / right;
}

describe("MathematicalEquationGenerator", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "is deterministic for %s configuration",
    (difficulty) => {
      const configuration = { seed: "stable-seed", difficulty };
      expect(mathematicalEquationGenerator.generate(configuration, 1)).toEqual(
        mathematicalEquationGenerator.generate(configuration, 1),
      );
    },
  );

  it.each([
    ["easy", 2],
    ["medium", 3],
    ["hard", 4],
  ] as const)("constructs %s candidates with %i variables", (difficulty, count) => {
    for (let seed = 0; seed < 250; seed += 1) {
      const candidate = mathematicalEquationGenerator.generate(
        { seed: `construction-${seed}`, difficulty },
        1,
      );
      const answer = candidate.correctAnswer;
      expect(candidate.structuredData.variables).toHaveLength(count);
      expect(candidate.structuredData.equations).toHaveLength(count);
      expect(Object.keys(answer).sort()).toEqual(
        [...candidate.structuredData.variables].sort(),
      );
      expect(Object.values(answer).every(Number.isInteger)).toBe(true);
      expect(
        Object.values(answer).every((value) => value >= 1 && value <= 20),
      ).toBe(true);
      for (const equation of candidate.structuredData.equations) {
        expect(evaluate(equation.left, answer)).toBe(evaluate(equation.right, answer));
      }
    }
  });

  it("uses the attempt to produce a deterministic retry candidate", () => {
    const configuration = { seed: "retry", difficulty: "hard" as const };
    expect(mathematicalEquationGenerator.generate(configuration, 1)).not.toEqual(
      mathematicalEquationGenerator.generate(configuration, 2),
    );
  });

  it("rejects invalid attempt numbers", () => {
    expect(() =>
      mathematicalEquationGenerator.generate({ seed: "bad", difficulty: "easy" }, 0),
    ).toThrow(RangeError);
  });

  it("rejects an empty generation seed", () => {
    expect(() =>
      mathematicalEquationGenerator.generate({ seed: "  ", difficulty: "easy" }, 1),
    ).toThrow(/non-empty/);
  });
});
