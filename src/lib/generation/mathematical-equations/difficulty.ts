import type { GenerationDifficulty } from "../types";
import { equationVariables } from "./solver";
import type {
  EquationDifficultyMetrics,
  EquationOperator,
  MathematicalEquationCandidate,
  MathematicalExpression,
} from "./types";

function expressionMetrics(expression: MathematicalExpression): {
  operations: number;
  coefficientComplexity: number;
  operators: Set<EquationOperator>;
} {
  if (expression.kind !== "operation") {
    return { operations: 0, coefficientComplexity: 0, operators: new Set() };
  }
  const left = expressionMetrics(expression.left);
  const right = expressionMetrics(expression.right);
  const constants = expression.operator === "multiply"
    ? [expression.left, expression.right]
        .filter((item): item is { kind: "constant"; value: number } => item.kind === "constant")
        .map((item) => Math.abs(item.value))
    : expression.operator === "divide" && expression.right.kind === "constant"
      ? [Math.abs(expression.right.value)]
      : [];
  return {
    operations: 1 + left.operations + right.operations,
    coefficientComplexity: Math.max(0, ...constants, left.coefficientComplexity, right.coefficientComplexity),
    operators: new Set([expression.operator, ...left.operators, ...right.operators]),
  };
}

function stepEquationIndices(step: MathematicalEquationCandidate["solutionPath"][number]): number[] {
  return [step.equationIndex, ...(step.supportingEquationIndices ?? [])];
}

function pointsForCount(value: number, base: number): number {
  return Math.max(0, value - base);
}

export function calculateEquationDifficulty(candidate: MathematicalEquationCandidate): {
  difficulty: GenerationDifficulty;
  metrics: EquationDifficultyMetrics;
} {
  const { variables, equations, dependencyModel } = candidate.structuredData;
  const depth = new Map<string, number>();
  const outgoing = new Map(variables.map((symbol) => [symbol, new Set<string>()]));
  let substitutionCount = 0;
  let operationCount = 0;
  let coefficientComplexity = 0;
  let compoundExpressionCount = 0;
  let recombinationCount = 0;
  let indirectCouplingCount = 0;
  let maximumStepLoad = 1;
  const operators = new Set<EquationOperator>();

  for (const step of candidate.solutionPath) {
    const indices = stepEquationIndices(step);
    const selectedEquations = indices.map((index) => equations[index]).filter(Boolean);
    const solvedBefore = new Set(step.knownSymbols);
    const referenced = new Set(selectedEquations.flatMap((item) => [...equationVariables(item)]));
    const dependencies = step.dependencySymbols ?? [...referenced].filter((symbol) =>
      symbol !== step.targetSymbol && solvedBefore.has(symbol),
    );
    substitutionCount += dependencies.length;
    if (dependencies.length >= 2) recombinationCount += 1;
    if (indices.length > 1 || step.reasoning === "combine_equations") indirectCouplingCount += 1;
    maximumStepLoad = Math.max(maximumStepLoad, dependencies.length + indices.length - 1);
    const targetDepth = dependencies.length
      ? Math.max(...dependencies.map((symbol) => depth.get(symbol) ?? 0)) + 1
      : 0;
    depth.set(step.targetSymbol, targetDepth);
    dependencies.forEach((source) => outgoing.get(source)?.add(step.targetSymbol));
  }

  for (const equation of equations) {
    let equationOperations = 0;
    for (const expression of [equation.left, equation.right]) {
      const metrics = expressionMetrics(expression);
      equationOperations += metrics.operations;
      operationCount += metrics.operations;
      coefficientComplexity = Math.max(coefficientComplexity, metrics.coefficientComplexity);
      metrics.operators.forEach((operator) => operators.add(operator));
    }
    if (equationOperations >= 2 || equationVariables(equation).size >= 3) compoundExpressionCount += 1;
  }

  const dependencyDepth = Math.max(0, ...depth.values());
  const outgoingCounts = [...outgoing.values()].map((targets) => targets.size);
  const branchingFactor = Math.max(0, ...outgoingCounts);
  const branchCount = outgoingCounts.filter((count) => count >= 2).length;
  const operatorVariety = operators.size;
  const directEntryPointCount = equations.filter((equation) => equationVariables(equation).size === 1).length;
  const obviousEntryPointPenalty = Number((directEntryPointCount / equations.length).toFixed(3));
  const hiddenGroupingCount = dependencyModel.hiddenGroupingCount ?? 0;
  const relationshipReversalCount = dependencyModel.relationshipReversalCount ??
    equations.filter((equation) => [equation.left, equation.right].some((expression) =>
      expression.kind === "operation" && expression.operator === "divide",
    )).length;
  const meaningfulReasoningSteps = dependencyModel.meaningfulReasoningSteps ?? candidate.solutionPath.length;
  const solveStepCount = meaningfulReasoningSteps;
  const workingMemoryEstimate = maximumStepLoad + Math.min(2, hiddenGroupingCount + branchCount);

  const score =
    pointsForCount(variables.length, 2) +
    pointsForCount(equations.length, 2) +
    pointsForCount(meaningfulReasoningSteps, 2) +
    hiddenGroupingCount +
    Math.min(1, relationshipReversalCount) +
    Math.min(2, dependencyDepth) +
    Math.max(0, maximumStepLoad - 2);

  const easyProfile =
    variables.length === 2 &&
    equations.length === 2 &&
    meaningfulReasoningSteps <= 2 &&
    hiddenGroupingCount === 0;
  const hardProfile =
    variables.length === 4 &&
    equations.length >= 4 &&
    (meaningfulReasoningSteps >= 5 || hiddenGroupingCount >= 2 || maximumStepLoad >= 4);
  const mediumProfile =
    variables.length >= 3 &&
    variables.length <= 4 &&
    equations.length >= 3 &&
    equations.length <= 4 &&
    meaningfulReasoningSteps >= 3 &&
    meaningfulReasoningSteps <= 4 &&
    (hiddenGroupingCount >= 1 || relationshipReversalCount >= 1 || maximumStepLoad >= 2);
  const difficulty: GenerationDifficulty = easyProfile
    ? "easy"
    : hardProfile
      ? "hard"
      : mediumProfile
        ? "medium"
        : score <= 2
          ? "easy"
          : score <= 8
            ? "medium"
            : "hard";

  return {
    difficulty,
    metrics: {
      variableCount: variables.length,
      equationCount: equations.length,
      dependencyDepth,
      branchingFactor,
      branchCount,
      recombinationCount,
      indirectCouplingCount,
      substitutionCount,
      operatorVariety,
      compoundExpressionCount,
      solveStepCount,
      operationCount,
      coefficientComplexity,
      directEntryPointCount,
      obviousEntryPointPenalty,
      workingMemoryEstimate,
      hiddenGroupingCount,
      relationshipReversalCount,
      meaningfulReasoningSteps,
      score,
    },
  };
}
