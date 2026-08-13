import { describe, expect, it } from "vitest";

import type { MathematicalExpression, VariableAssignment } from "./types";
import { calculateEquationDifficulty } from "./difficulty";
import {
  MATHEMATICAL_EQUATION_FAMILY_REGISTRY,
  mathematicalEquationGenerator,
} from "./generator";

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

  it.each(["easy", "medium", "hard"] as const)(
    "constructs clean solution-first %s candidates",
    (difficulty) => {
      for (let seed = 0; seed < 250; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate(
          { seed: `construction-${seed}`, difficulty },
          1,
        );
        const answer = candidate.correctAnswer;
        const variableCount = candidate.structuredData.variables.length;
        if (difficulty === "easy") expect(variableCount).toBe(2);
        else if (difficulty === "hard") expect(variableCount).toBe(4);
        else expect([3, 4]).toContain(variableCount);
        expect(candidate.structuredData.equations).toHaveLength(variableCount);
        expect(Object.keys(answer).sort()).toEqual([...candidate.structuredData.variables].sort());
        expect(Object.values(answer).every(Number.isInteger)).toBe(true);
        expect(Object.values(answer).every((value) => value >= 1 && value <= 20)).toBe(true);
        expect(candidate.response).toEqual({ kind: "symbol_assignment", symbols: candidate.structuredData.variables });
        expect(candidate.reasoningPath.length).toBeGreaterThanOrEqual(2);
        expect(candidate.fastestMethod.length).toBeGreaterThan(20);
        expect(candidate.presentation.blocks.every((block) =>
          block.kind !== "formula" || (!block.expression.includes("*") && !block.expression.includes("/")),
        )).toBe(true);
        for (const equation of candidate.structuredData.equations) {
          expect(evaluate(equation.left, answer)).toBe(evaluate(equation.right, answer));
        }
      }
    },
  );

  it("uses the attempt to produce a deterministic retry candidate", () => {
    const configuration = { seed: "retry", difficulty: "hard" as const };
    expect(mathematicalEquationGenerator.generate(configuration, 1)).not.toEqual(
      mathematicalEquationGenerator.generate(configuration, 2),
    );
  });

  it("rejects invalid attempts and empty seeds", () => {
    expect(() => mathematicalEquationGenerator.generate({ seed: "bad", difficulty: "easy" }, 0)).toThrow(RangeError);
    expect(() => mathematicalEquationGenerator.generate({ seed: "  ", difficulty: "easy" }, 1)).toThrow(/non-empty/);
  });

  it.each(["easy", "medium", "hard"] as const)(
    "calibrates %s by structural reasoning rather than number size",
    (difficulty) => {
      const families = new Set<string>();
      const firstEquationPositions = new Set<number>();
      for (let seed = 0; seed < 200; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate({ seed: `calibration-${difficulty}-${seed}`, difficulty }, 1);
        const metrics = calculateEquationDifficulty(candidate).metrics;
        families.add(candidate.structuredData.dependencyModel.family);
        firstEquationPositions.add(candidate.solutionPath[0].equationIndex);
        expect(calculateEquationDifficulty(candidate).difficulty).toBe(difficulty);
        expect(metrics.coefficientComplexity).toBeLessThanOrEqual(6);
        expect(metrics.directEntryPointCount).toBe(0);
        if (difficulty === "easy") {
          expect(metrics.variableCount).toBe(2);
          expect(metrics.meaningfulReasoningSteps).toBe(2);
          expect(metrics.hiddenGroupingCount).toBe(0);
        } else if (difficulty === "medium") {
          expect([3, 4]).toContain(metrics.variableCount);
          expect(metrics.meaningfulReasoningSteps).toBeGreaterThanOrEqual(3);
          expect(metrics.meaningfulReasoningSteps).toBeLessThanOrEqual(4);
          expect(metrics.hiddenGroupingCount + metrics.relationshipReversalCount).toBeGreaterThanOrEqual(1);
        } else {
          expect(metrics.variableCount).toBe(4);
          expect(metrics.meaningfulReasoningSteps).toBeGreaterThanOrEqual(5);
          expect(candidate.solutionPath[0].supportingEquationIndices?.length).toBe(3);
        }
      }
      expect(families.size).toBe(4);
      expect(firstEquationPositions.size).toBeGreaterThan(1);
    },
  );

  it("registers twelve reusable dMAT-style templates", () => {
    const distribution = MATHEMATICAL_EQUATION_FAMILY_REGISTRY.reduce<Record<string, number>>(
      (counts, family) => ({ ...counts, [family.difficulty]: (counts[family.difficulty] ?? 0) + 1 }),
      {},
    );
    expect(distribution).toEqual({ easy: 4, medium: 4, hard: 4 });
    expect(new Set(MATHEMATICAL_EQUATION_FAMILY_REGISTRY.map((family) => family.id)).size).toBe(12);
  });

  it("covers every template and keeps grouping frequent in medium and hard", () => {
    const byFamily = new Map<string, ReturnType<typeof mathematicalEquationGenerator.generate>>();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 1_000 && [...byFamily.values()].filter((item) =>
        item.structuredData.dependencyModel.family.startsWith(difficulty),
      ).length < 4; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate({ seed: `family-${difficulty}-${seed}`, difficulty }, 1);
        byFamily.set(candidate.structuredData.dependencyModel.family, candidate);
      }
    }
    expect(byFamily.size).toBe(12);
    const representative = [...byFamily.values()].filter((candidate) =>
      candidate.structuredData.dependencyModel.family.startsWith("medium") ||
      candidate.structuredData.dependencyModel.family.startsWith("hard"),
    );
    expect(representative.filter((candidate) =>
      (candidate.structuredData.dependencyModel.hiddenGroupingCount ?? 0) > 0,
    ).length).toBeGreaterThanOrEqual(6);
  });
});
