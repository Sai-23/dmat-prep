import type { QuestionSolver } from "../types";
import {
  MATHEMATICAL_EQUATION_SOLVER_VERSION,
  type EquationSolverOutcome,
  type MathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalExpression,
  type VariableAssignment,
} from "./types";

type Evaluation =
  | { known: true; valid: true; value: number }
  | { known: true; valid: false; value: null }
  | { known: false; valid: true; value: null };

export function expressionVariables(expression: MathematicalExpression): Set<string> {
  if (expression.kind === "constant") return new Set();
  if (expression.kind === "variable") return new Set([expression.symbol]);
  return new Set([
    ...expressionVariables(expression.left),
    ...expressionVariables(expression.right),
  ]);
}

export function equationVariables(equation: MathematicalEquation): Set<string> {
  return new Set([
    ...expressionVariables(equation.left),
    ...expressionVariables(equation.right),
  ]);
}

export function evaluateExpression(
  expression: MathematicalExpression,
  assignment: Readonly<VariableAssignment>,
): Evaluation {
  if (expression.kind === "constant") {
    return Number.isSafeInteger(expression.value)
      ? { known: true, valid: true, value: expression.value }
      : { known: true, valid: false, value: null };
  }
  if (expression.kind === "variable") {
    return Object.hasOwn(assignment, expression.symbol)
      ? { known: true, valid: true, value: assignment[expression.symbol] }
      : { known: false, valid: true, value: null };
  }

  const left = evaluateExpression(expression.left, assignment);
  const right = evaluateExpression(expression.right, assignment);
  if (!left.valid || !right.valid) return { known: true, valid: false, value: null };
  if (!left.known || !right.known) return { known: false, valid: true, value: null };

  let value: number;
  if (expression.operator === "add") value = left.value + right.value;
  else if (expression.operator === "subtract") value = left.value - right.value;
  else if (expression.operator === "multiply") value = left.value * right.value;
  else {
    if (right.value === 0 || left.value % right.value !== 0) {
      return { known: true, valid: false, value: null };
    }
    value = left.value / right.value;
  }
  return Number.isSafeInteger(value)
    ? { known: true, valid: true, value }
    : { known: true, valid: false, value: null };
}

function equationSatisfied(
  equation: MathematicalEquation,
  assignment: Readonly<VariableAssignment>,
): boolean {
  const left = evaluateExpression(equation.left, assignment);
  const right = evaluateExpression(equation.right, assignment);
  return Boolean(
    left.known && left.valid && right.known && right.valid && left.value === right.value,
  );
}

export class MathematicalEquationSolver
  implements QuestionSolver<MathematicalEquationCandidate, EquationSolverOutcome>
{
  readonly questionType = "mathematical_equation" as const;
  readonly version = MATHEMATICAL_EQUATION_SOLVER_VERSION;

  solve(candidate: MathematicalEquationCandidate): EquationSolverOutcome {
    const { variables, equations, domain } = candidate.structuredData;
    const declared = new Set(variables);
    if (
      variables.length === 0 ||
      new Set(variables).size !== variables.length ||
      equations.length === 0 ||
      !Number.isSafeInteger(domain.minimum) ||
      !Number.isSafeInteger(domain.maximum) ||
      domain.minimum > domain.maximum
    ) {
      return { status: "invalid", solutions: [], exploredAssignments: 0, reason: "Invalid system structure." };
    }
    const references = equations.map(equationVariables);
    if (references.some((symbols) => [...symbols].some((symbol) => !declared.has(symbol)))) {
      return { status: "invalid", solutions: [], exploredAssignments: 0, reason: "Equation references an undeclared variable." };
    }

    const solutions: VariableAssignment[] = [];
    const assignment: VariableAssignment = {};
    let exploredAssignments = 0;

    const search = (): void => {
      if (solutions.length >= 2) return;
      const unassigned = variables.filter((symbol) => !Object.hasOwn(assignment, symbol));
      if (unassigned.length === 0) {
        if (equations.every((equation) => equationSatisfied(equation, assignment))) {
          solutions.push({ ...assignment });
        }
        return;
      }

      const symbol = [...unassigned].sort((first, second) => {
        const score = (value: string) =>
          references.reduce((total, symbols) => {
            if (!symbols.has(value)) return total;
            const remaining = [...symbols].filter(
              (item) => item !== value && !Object.hasOwn(assignment, item),
            ).length;
            return total + (remaining === 0 ? 100 : 1 / (remaining + 1));
          }, 0);
        return score(second) - score(first) || first.localeCompare(second);
      })[0];

      for (let value = domain.minimum; value <= domain.maximum; value += 1) {
        assignment[symbol] = value;
        exploredAssignments += 1;
        const contradicted = equations.some((equation, index) => {
          const complete = [...references[index]].every((item) =>
            Object.hasOwn(assignment, item),
          );
          return complete && !equationSatisfied(equation, assignment);
        });
        if (!contradicted) search();
        delete assignment[symbol];
        if (solutions.length >= 2) break;
      }
    };

    search();
    return {
      status: solutions.length === 0 ? "none" : solutions.length === 1 ? "unique" : "multiple",
      solutions,
      exploredAssignments,
      reason: null,
    };
  }
}

export const mathematicalEquationSolver = new MathematicalEquationSolver();

