import { describe, expect, it } from "vitest";

import { mathematicalEquationGenerator } from "./generator";
import { mathematicalEquationSolver } from "./solver";
import type {
  MathematicalEquationCandidate,
  MathematicalExpression,
} from "./types";

const variable = (symbol: string): MathematicalExpression => ({ kind: "variable", symbol });
const constant = (value: number): MathematicalExpression => ({ kind: "constant", value });

function baseCandidate(): MathematicalEquationCandidate {
  return mathematicalEquationGenerator.generate(
    { seed: "solver-fixture", difficulty: "easy" },
    1,
  );
}

describe("MathematicalEquationSolver", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "independently finds the generated %s assignment",
    (difficulty) => {
      for (let seed = 0; seed < 100; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate(
          { seed: `solver-${seed}`, difficulty },
          1,
        );
        const outcome = mathematicalEquationSolver.solve(candidate);
        expect(outcome.status).toBe("unique");
        expect(outcome.solutions).toEqual([candidate.correctAnswer]);
      }
    },
  );

  it("detects multiple domain solutions", () => {
    const candidate = baseCandidate();
    candidate.structuredData.equations = [
      { left: variable("A"), right: constant(1) },
    ];
    const outcome = mathematicalEquationSolver.solve(candidate);
    expect(outcome.status).toBe("multiple");
    expect(outcome.solutions).toHaveLength(2);
  });

  it("detects contradictory systems", () => {
    const candidate = baseCandidate();
    candidate.structuredData.equations = [
      { left: variable("A"), right: constant(1) },
      { left: variable("A"), right: constant(2) },
    ];
    expect(mathematicalEquationSolver.solve(candidate).status).toBe("none");
  });

  it("does not accept non-exact division paths", () => {
    const candidate = baseCandidate();
    candidate.structuredData.equations = [
      {
        left: {
          kind: "operation",
          operator: "divide",
          left: variable("A"),
          right: constant(2),
        },
        right: constant(1),
      },
      { left: variable("B"), right: variable("A") },
    ];
    const outcome = mathematicalEquationSolver.solve(candidate);
    expect(outcome.status).toBe("unique");
    expect(outcome.solutions[0]).toEqual({ A: 2, B: 2 });
  });

  it("rejects undeclared equation variables", () => {
    const candidate = baseCandidate();
    candidate.structuredData.equations[0] = {
      left: variable("Z"),
      right: constant(1),
    };
    expect(mathematicalEquationSolver.solve(candidate).status).toBe("invalid");
  });
});

