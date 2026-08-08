import type { GenerationDifficulty } from "../types";
import { equationVariables } from "./solver";
import type {
  EquationDifficultyMetrics,
  MathematicalEquationCandidate,
  MathematicalExpression,
} from "./types";

function expressionMetrics(expression: MathematicalExpression): {
  operations: number;
  coefficientComplexity: number;
} {
  if (expression.kind !== "operation") return { operations: 0, coefficientComplexity: 0 };
  const left = expressionMetrics(expression.left);
  const right = expressionMetrics(expression.right);
  const constants = [expression.left, expression.right]
    .filter((item): item is { kind: "constant"; value: number } => item.kind === "constant")
    .map((item) => Math.abs(item.value));
  const coefficient =
    expression.operator === "multiply" || expression.operator === "divide"
      ? Math.max(0, ...constants)
      : 0;
  return {
    operations: 1 + left.operations + right.operations,
    coefficientComplexity: Math.max(
      coefficient,
      left.coefficientComplexity,
      right.coefficientComplexity,
    ),
  };
}

export function calculateEquationDifficulty(candidate: MathematicalEquationCandidate): {
  difficulty: GenerationDifficulty;
  metrics: EquationDifficultyMetrics;
} {
  const { variables, equations } = candidate.structuredData;
  const graph = new Map(variables.map((symbol) => [symbol, new Set<string>()]));
  const anchors: string[] = [];
  let operationCount = 0;
  let coefficientComplexity = 0;

  for (const equation of equations) {
    const symbols = [...equationVariables(equation)];
    if (symbols.length === 1) anchors.push(symbols[0]);
    for (const first of symbols) {
      for (const second of symbols) {
        if (first !== second) graph.get(first)?.add(second);
      }
    }
    for (const expression of [equation.left, equation.right]) {
      const metrics = expressionMetrics(expression);
      operationCount += metrics.operations;
      coefficientComplexity = Math.max(
        coefficientComplexity,
        metrics.coefficientComplexity,
      );
    }
  }

  const distances = new Map<string, number>();
  const queue = [...new Set(anchors)];
  for (const anchor of queue) distances.set(anchor, 0);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const next of graph.get(current) ?? []) {
      if (!distances.has(next)) {
        distances.set(next, (distances.get(current) ?? 0) + 1);
        queue.push(next);
      }
    }
  }
  const dependencyDepth = Math.max(0, ...distances.values());
  const score =
    Math.max(0, variables.length - 2) * 2 +
    dependencyDepth +
    Math.max(0, operationCount - equations.length) +
    (coefficientComplexity >= 4 ? 1 : 0);
  const difficulty: GenerationDifficulty = score <= 2 ? "easy" : score <= 5 ? "medium" : "hard";
  return {
    difficulty,
    metrics: {
      variableCount: variables.length,
      equationCount: equations.length,
      dependencyDepth,
      operationCount,
      coefficientComplexity,
      score,
    },
  };
}

