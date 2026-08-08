import { describe, expect, it } from "vitest";

import { fingerprintMathematicalEquation } from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";
import type { MathematicalExpression } from "./types";

function incrementFirstConstant(expression: MathematicalExpression): boolean {
  if (expression.kind === "constant") {
    expression.value += 1;
    return true;
  }
  if (expression.kind === "variable") return false;
  return incrementFirstConstant(expression.left) || incrementFirstConstant(expression.right);
}

describe("mathematical-equation fingerprints", () => {
  it("ignores equation display order and wording", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "fingerprint", difficulty: "hard" },
      1,
    );
    const reordered = structuredClone(candidate);
    reordered.structuredData.equations.reverse();
    reordered.presentation.prompt = "Different display wording";
    reordered.explanation = "Different explanation wording";
    expect(fingerprintMathematicalEquation(reordered)).toBe(
      fingerprintMathematicalEquation(candidate),
    );
  });

  it("changes when semantic constants change", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "fingerprint-change", difficulty: "easy" },
      1,
    );
    const changed = structuredClone(candidate);
    const equation = changed.structuredData.equations[0];
    expect(
      incrementFirstConstant(equation.left) || incrementFirstConstant(equation.right),
    ).toBe(true);
    expect(fingerprintMathematicalEquation(changed)).not.toBe(
      fingerprintMathematicalEquation(candidate),
    );
  });
});
