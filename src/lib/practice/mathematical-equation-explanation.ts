import {
  equationVariables,
  evaluateExpression,
  type EquationSolutionStep,
  type MathematicalEquation,
  type MathematicalEquationStructuredData,
  type MathematicalExpression,
  type VariableAssignment,
} from "../generation/mathematical-equations";

export type EquationExplanationStep = {
  id: string;
  type: "solve_variable" | "substitute" | "combine_equations";
  eyebrow: "CHOOSE A RELATIONSHIP" | "SUBSTITUTE AND SOLVE" | "COMBINE RELATIONSHIPS";
  title: string;
  instruction: string;
  activeEquationIndex: number;
  activeEquationIndices: number[];
  originalEquation: string;
  substitutedEquation: string;
  targetSymbol: string;
  solvedValue: number;
  knownValues: VariableAssignment;
  solvedValues: VariableAssignment;
  isFinal: boolean;
};

export type EquationWalkthrough = {
  valid: boolean;
  steps: EquationExplanationStep[];
  fallbackMessage: string | null;
  assignment: VariableAssignment | null;
};

const operatorText = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
} as const;

function precedence(expression: MathematicalExpression): number {
  if (expression.kind !== "operation") return 3;
  return expression.operator === "multiply" || expression.operator === "divide" ? 2 : 1;
}

export function equationExpressionText(
  expression: MathematicalExpression,
  parentPrecedence = 0,
  isRight = false,
): string {
  if (expression.kind === "constant") return String(expression.value);
  if (expression.kind === "variable") return expression.symbol;
  const currentPrecedence = precedence(expression);
  const left = equationExpressionText(expression.left, currentPrecedence);
  const right = equationExpressionText(expression.right, currentPrecedence, true);
  const text = `${left} ${operatorText[expression.operator]} ${right}`;
  const needsParentheses = currentPrecedence < parentPrecedence ||
    (isRight && currentPrecedence === parentPrecedence &&
      (expression.operator === "subtract" || expression.operator === "divide"));
  return needsParentheses ? `(${text})` : text;
}

export function presentationEquationText(equation: MathematicalEquation): string {
  return `${equationExpressionText(equation.left)} = ${equationExpressionText(equation.right)}`;
}

function foldOperation(expression: MathematicalExpression): MathematicalExpression {
  if (expression.kind !== "operation") return expression;
  const left = foldOperation(expression.left);
  const right = foldOperation(expression.right);
  if (left.kind !== "constant" || right.kind !== "constant") {
    return { ...expression, left, right };
  }
  if (expression.operator === "divide" && (right.value === 0 || left.value % right.value !== 0)) {
    return { ...expression, left, right };
  }
  const value = expression.operator === "add"
    ? left.value + right.value
    : expression.operator === "subtract"
      ? left.value - right.value
      : expression.operator === "multiply"
        ? left.value * right.value
        : left.value / right.value;
  return { kind: "constant", value };
}

function substituteExpression(
  expression: MathematicalExpression,
  knownValues: Readonly<VariableAssignment>,
): MathematicalExpression {
  if (expression.kind === "constant") return expression;
  if (expression.kind === "variable") {
    return Object.hasOwn(knownValues, expression.symbol)
      ? { kind: "constant", value: knownValues[expression.symbol] }
      : expression;
  }
  return foldOperation({
    ...expression,
    left: substituteExpression(expression.left, knownValues),
    right: substituteExpression(expression.right, knownValues),
  });
}

function substitutedEquation(
  equation: MathematicalEquation,
  knownValues: Readonly<VariableAssignment>,
): MathematicalEquation {
  return {
    left: substituteExpression(equation.left, knownValues),
    right: substituteExpression(equation.right, knownValues),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseAssignment(
  data: MathematicalEquationStructuredData,
  value: unknown,
): VariableAssignment | null {
  const input = record(value);
  if (!input) return null;
  const assignment: VariableAssignment = {};
  for (const symbol of data.variables) {
    const number = input[symbol];
    if (
      !Number.isInteger(number) ||
      Number(number) < data.domain.minimum ||
      Number(number) > data.domain.maximum
    ) return null;
    assignment[symbol] = Number(number);
  }
  return Object.keys(input).length === data.variables.length ? assignment : null;
}

function parseSolutionStep(value: unknown): EquationSolutionStep | null {
  const step = record(value);
  if (
    !step ||
    !Number.isInteger(step.equationIndex) ||
    typeof step.targetSymbol !== "string" ||
    !Array.isArray(step.knownSymbols) ||
    !step.knownSymbols.every((symbol) => typeof symbol === "string") ||
    (step.supportingEquationIndices !== undefined &&
      (!Array.isArray(step.supportingEquationIndices) ||
        !step.supportingEquationIndices.every((index) => Number.isInteger(index)))) ||
    (step.dependencySymbols !== undefined &&
      (!Array.isArray(step.dependencySymbols) ||
        !step.dependencySymbols.every((symbol) => typeof symbol === "string"))) ||
    (step.reasoning !== undefined &&
      !["solve_variable", "substitute", "combine_equations"].includes(String(step.reasoning)))
  ) return null;
  return {
    equationIndex: Number(step.equationIndex),
    ...(step.supportingEquationIndices === undefined
      ? {}
      : { supportingEquationIndices: step.supportingEquationIndices.map(Number) }),
    targetSymbol: step.targetSymbol,
    knownSymbols: step.knownSymbols,
    ...(step.dependencySymbols === undefined
      ? {}
      : { dependencySymbols: step.dependencySymbols as string[] }),
    ...(step.reasoning === undefined
      ? {}
      : { reasoning: step.reasoning as EquationSolutionStep["reasoning"] }),
  };
}

function equationIsTrue(
  equation: MathematicalEquation,
  assignment: Readonly<VariableAssignment>,
): boolean {
  const left = evaluateExpression(equation.left, assignment);
  const right = evaluateExpression(equation.right, assignment);
  return Boolean(
    left.known && left.valid && right.known && right.valid && left.value === right.value,
  );
}

function assignmentIsValid(
  data: MathematicalEquationStructuredData,
  assignment: Readonly<VariableAssignment>,
): boolean {
  return data.equations.every((equation) => equationIsTrue(equation, assignment));
}

function possibleTargetValues(
  equations: readonly MathematicalEquation[],
  targetSymbol: string,
  knownValues: Readonly<VariableAssignment>,
  data: MathematicalEquationStructuredData,
): number[] {
  const unresolved = [...new Set(equations.flatMap((equation) => [...equationVariables(equation)]))]
    .filter((symbol) => !Object.hasOwn(knownValues, symbol));
  if (!unresolved.includes(targetSymbol)) return [];
  const possible = new Set<number>();
  const partial: VariableAssignment = { ...knownValues };
  const search = (index: number): void => {
    if (index === unresolved.length) {
      if (equations.every((equation) => equationIsTrue(equation, partial))) {
        possible.add(partial[targetSymbol]);
      }
      return;
    }
    const symbol = unresolved[index];
    for (let value = data.domain.minimum; value <= data.domain.maximum; value += 1) {
      partial[symbol] = value;
      search(index + 1);
    }
    delete partial[symbol];
  };
  search(0);
  return [...possible].sort((first, second) => first - second);
}

function fallback(
  data: MathematicalEquationStructuredData,
  assignment: VariableAssignment | null,
): EquationWalkthrough {
  if (!assignment || !assignmentIsValid(data, assignment)) {
    return {
      valid: false,
      steps: [],
      fallbackMessage: "The verified solution is unavailable.",
      assignment: null,
    };
  }
  return {
    valid: false,
    steps: [],
    fallbackMessage: `Verified solution: ${data.variables.map((symbol) => `${symbol} = ${assignment[symbol]}`).join(", ")}.`,
    assignment,
  };
}

export function buildMathematicalEquationWalkthrough(
  data: MathematicalEquationStructuredData,
  rawTrace: unknown,
  correctAnswer: unknown,
): EquationWalkthrough {
  const assignment = parseAssignment(data, correctAnswer);
  if (!assignment || !assignmentIsValid(data, assignment) || !Array.isArray(rawTrace)) {
    return fallback(data, assignment);
  }
  const parsed = rawTrace.map(parseSolutionStep);
  if (parsed.some((step) => step === null) || parsed.length !== data.variables.length) {
    return fallback(data, assignment);
  }
  const solutionPath = parsed as EquationSolutionStep[];
  const solvedValues: VariableAssignment = {};
  const solvedSymbols: string[] = [];
  const steps: EquationExplanationStep[] = [];
  for (let index = 0; index < solutionPath.length; index += 1) {
    const pathStep = solutionPath[index];
    const equationIndices = [pathStep.equationIndex, ...(pathStep.supportingEquationIndices ?? [])];
    const equations = equationIndices.map((equationIndex) => data.equations[equationIndex]);
    const equation = equations[0];
    const expectedKnown = [...solvedSymbols].sort().join("|");
    if (
      !equation ||
      new Set(equationIndices).size !== equationIndices.length ||
      equations.some((item) => !item) ||
      !data.variables.includes(pathStep.targetSymbol) ||
      Object.hasOwn(solvedValues, pathStep.targetSymbol) ||
      [...pathStep.knownSymbols].sort().join("|") !== expectedKnown
    ) return fallback(data, assignment);
    const references = new Set(equations.flatMap((item) => [...equationVariables(item)]));
    if (!references.has(pathStep.targetSymbol)) return fallback(data, assignment);
    const possibleValues = possibleTargetValues(
      equations as MathematicalEquation[],
      pathStep.targetSymbol,
      solvedValues,
      data,
    );
    const solvedValue = assignment[pathStep.targetSymbol];
    if (possibleValues.length !== 1 || possibleValues[0] !== solvedValue) {
      return fallback(data, assignment);
    }
    const before = { ...solvedValues };
    solvedValues[pathStep.targetSymbol] = solvedValue;
    solvedSymbols.push(pathStep.targetSymbol);
    const dependencies = pathStep.dependencySymbols ?? pathStep.knownSymbols;
    const combined = equationIndices.length > 1 || pathStep.reasoning === "combine_equations";
    const original = equations.map((item, equationIndex) =>
      combined
        ? `Eq. ${equationIndices[equationIndex] + 1}: ${presentationEquationText(item)}`
        : presentationEquationText(item),
    ).join("  •  ");
    const substituted = equations.map((item, equationIndex) => {
      const text = presentationEquationText(substitutedEquation(item, before));
      return combined ? `Eq. ${equationIndices[equationIndex] + 1}: ${text}` : text;
    }).join("  •  ");
    const type = combined
      ? "combine_equations" as const
      : dependencies.length
        ? "substitute" as const
        : "solve_variable" as const;
    steps.push({
      id: `${index}:${pathStep.targetSymbol}`,
      type,
      eyebrow: combined
        ? "COMBINE RELATIONSHIPS"
        : dependencies.length
          ? "SUBSTITUTE AND SOLVE"
          : "CHOOSE A RELATIONSHIP",
      title: `Find ${pathStep.targetSymbol}`,
      instruction: combined
        ? `Use equations ${equationIndices.map((value) => value + 1).join(" and ")} together to eliminate the other unknown.`
        : dependencies.length
          ? `Use ${pathStep.knownSymbols.map((symbol) => `${symbol} = ${assignment[symbol]}`).join(" and ")} here.`
          : "Start here because only one letter is unknown.",
      activeEquationIndex: pathStep.equationIndex,
      activeEquationIndices: equationIndices,
      originalEquation: original,
      substitutedEquation: substituted,
      targetSymbol: pathStep.targetSymbol,
      solvedValue,
      knownValues: before,
      solvedValues: { ...solvedValues },
      isFinal: index === solutionPath.length - 1,
    });
  }
  return { valid: true, steps, fallbackMessage: null, assignment };
}
