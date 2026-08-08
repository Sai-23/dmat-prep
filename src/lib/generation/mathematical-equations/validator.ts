import type {
  GenerationDifficulty,
  QuestionValidator,
  ValidationCheck,
  ValidationIssue,
  ValidationResult,
} from "../types";
import { calculateEquationDifficulty } from "./difficulty";
import {
  equationVariables,
  evaluateExpression,
  mathematicalEquationSolver,
} from "./solver";
import {
  MATHEMATICAL_EQUATION_DOMAIN,
  MATHEMATICAL_EQUATION_VALIDATOR_VERSION,
  type MathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalEquationValidationSolution,
  type MathematicalExpression,
  type VariableAssignment,
} from "./types";

function check(
  stage: ValidationCheck["stage"],
  passed: boolean,
  details?: ValidationCheck["details"],
): ValidationCheck {
  return {
    stage,
    passed,
    validatorVersion: MATHEMATICAL_EQUATION_VALIDATOR_VERSION,
    ...(details === undefined ? {} : { details }),
  };
}

function issue(
  stage: ValidationIssue["stage"],
  code: string,
  message: string,
  path?: string,
): ValidationIssue {
  return { stage, code, message, ...(path ? { path } : {}) };
}

function validateExpression(
  expression: MathematicalExpression,
  declared: ReadonlySet<string>,
  path: string,
  issues: ValidationIssue[],
): void {
  if (expression.kind === "constant") {
    if (!Number.isSafeInteger(expression.value) || Math.abs(expression.value) > 40) {
      issues.push(issue("format", "invalid_constant", "Constants must be safe mental-calculation integers with magnitude at most 40.", path));
    }
    return;
  }
  if (expression.kind === "variable") {
    if (!declared.has(expression.symbol)) {
      issues.push(issue("format", "undeclared_variable", `Variable ${expression.symbol} is not declared.`, path));
    }
    return;
  }
  validateExpression(expression.left, declared, `${path}.left`, issues);
  validateExpression(expression.right, declared, `${path}.right`, issues);
  if (expression.operator === "multiply") {
    if (expression.left.kind !== "constant" && expression.right.kind !== "constant") {
      issues.push(issue("format", "nonlinear_multiplication", "Multiplication must use an integer constant coefficient.", path));
    }
  }
  if (expression.operator === "divide") {
    if (expression.right.kind !== "constant" || expression.right.value === 0) {
      issues.push(issue("safety", "invalid_divisor", "Division must use a non-zero integer constant divisor.", path));
    }
  }
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

function sameAssignment(
  first: Readonly<VariableAssignment>,
  second: Readonly<VariableAssignment>,
  variables: readonly string[],
): boolean {
  return variables.every((symbol) => first[symbol] === second[symbol]);
}

function validateSolutionPath(
  candidate: MathematicalEquationCandidate,
  assignment: Readonly<VariableAssignment>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const solved = new Set<string>();
  const { equations, domain, variables } = candidate.structuredData;
  if (candidate.solutionPath.length !== variables.length) {
    return [issue("explanation", "incomplete_solution_path", "The solution path must solve every variable exactly once.")];
  }

  candidate.solutionPath.forEach((step, stepIndex) => {
    const path = `solutionPath.${stepIndex}`;
    const equation = equations[step.equationIndex];
    if (!equation || !variables.includes(step.targetSymbol) || solved.has(step.targetSymbol)) {
      issues.push(issue("explanation", "invalid_solution_step", "A solution step has an invalid equation or target.", path));
      return;
    }
    const reportedKnown = [...step.knownSymbols].sort();
    const actualKnown = [...solved].sort();
    if (reportedKnown.join("\u001f") !== actualKnown.join("\u001f")) {
      issues.push(issue("explanation", "incorrect_known_symbols", "The solution step does not accurately report prior deductions.", path));
      return;
    }
    const references = equationVariables(equation);
    if (
      !references.has(step.targetSymbol) ||
      [...references].some((symbol) => symbol !== step.targetSymbol && !solved.has(symbol))
    ) {
      issues.push(issue("explanation", "non_deductive_step", "The step depends on a variable that has not yet been solved.", path));
      return;
    }
    const knownAssignment = Object.fromEntries(
      [...solved].map((symbol) => [symbol, assignment[symbol]]),
    );
    const possibleValues: number[] = [];
    for (let value = domain.minimum; value <= domain.maximum; value += 1) {
      if (equationIsTrue(equation, { ...knownAssignment, [step.targetSymbol]: value })) {
        possibleValues.push(value);
      }
    }
    if (
      possibleValues.length !== 1 ||
      possibleValues[0] !== assignment[step.targetSymbol] ||
      !candidate.explanation.includes(`${step.targetSymbol} = ${assignment[step.targetSymbol]}`)
    ) {
      issues.push(issue("explanation", "unverified_solution_step", "The explanation step does not uniquely reproduce the solved value.", path));
      return;
    }
    solved.add(step.targetSymbol);
  });
  return issues;
}

export class MathematicalEquationValidator
  implements
    QuestionValidator<
      MathematicalEquationCandidate,
      MathematicalEquationValidationSolution
    >
{
  readonly questionType = "mathematical_equation" as const;
  readonly version = MATHEMATICAL_EQUATION_VALIDATOR_VERSION;

  validate(
    candidate: MathematicalEquationCandidate,
    requestedDifficulty: GenerationDifficulty,
  ): ValidationResult<MathematicalEquationValidationSolution> {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    const { variables, equations, domain } = candidate.structuredData;
    const declared = new Set(variables);

    if (
      candidate.questionType !== "mathematical_equation" ||
      candidate.module !== "core" ||
      variables.length < 2 ||
      variables.length > 4 ||
      declared.size !== variables.length ||
      variables.some((symbol) => !/^[A-Z]$/.test(symbol)) ||
      equations.length < 2 ||
      equations.length !== variables.length ||
      domain.minimum !== MATHEMATICAL_EQUATION_DOMAIN.minimum ||
      domain.maximum !== MATHEMATICAL_EQUATION_DOMAIN.maximum ||
      domain.integersOnly !== true
    ) {
      issues.push(issue("format", "invalid_system_shape", "The equation system does not match the supported dMAT format."));
    }
    equations.forEach((equation, index) => {
      validateExpression(equation.left, declared, `equations.${index}.left`, issues);
      validateExpression(equation.right, declared, `equations.${index}.right`, issues);
    });
    if (
      candidate.response.kind !== "symbol_assignment" ||
      [...candidate.response.symbols].sort().join("") !== [...variables].sort().join("")
    ) {
      issues.push(issue("format", "invalid_response", "The response must request every declared variable."));
    }
    checks.push(check("format", !issues.some((item) => item.stage === "format")));
    checks.push(check("safety", !issues.some((item) => item.stage === "safety")));
    if (issues.length) return { valid: false, issues, checks };

    const outcome = mathematicalEquationSolver.solve(candidate);
    checks.push(check("solve", outcome.status !== "invalid", { exploredAssignments: outcome.exploredAssignments }));
    checks.push(check("uniqueness", outcome.status === "unique", { solutionCount: outcome.solutions.length }));
    if (outcome.status !== "unique") {
      return {
        valid: false,
        issues: [
          issue(
            outcome.status === "invalid" ? "solve" : "uniqueness",
            outcome.status === "none" ? "no_solution" : outcome.status === "multiple" ? "multiple_solutions" : "solver_rejected",
            outcome.reason ?? `The system has ${outcome.status === "multiple" ? "more than one" : "no"} valid domain solution.`,
          ),
        ],
        checks,
      };
    }

    const assignment = outcome.solutions[0];
    const answerKeys = Object.keys(candidate.correctAnswer).sort();
    const domainValid =
      answerKeys.join("") === [...variables].sort().join("") &&
      Object.values(candidate.correctAnswer).every(
        (value) => Number.isInteger(value) && value >= domain.minimum && value <= domain.maximum,
      ) &&
      sameAssignment(candidate.correctAnswer, assignment, variables) &&
      equations.every((equation) => equationIsTrue(equation, assignment));
    checks.push(check("domain", domainValid));
    if (!domainValid) {
      return {
        valid: false,
        issues: [issue("domain", "stored_answer_mismatch", "The stored answer does not match the independent unique solution.")],
        checks,
      };
    }

    const explanationIssues = validateSolutionPath(candidate, assignment);
    checks.push(check("explanation", explanationIssues.length === 0));
    if (explanationIssues.length) return { valid: false, issues: explanationIssues, checks };

    const calculated = calculateEquationDifficulty(candidate);
    const difficultyMatches = calculated.difficulty === requestedDifficulty;
    checks.push(check("difficulty", difficultyMatches, calculated.metrics));
    if (!difficultyMatches) {
      return {
        valid: false,
        issues: [issue("difficulty", "difficulty_mismatch", `Requested ${requestedDifficulty}, calculated ${calculated.difficulty}.`)],
        checks,
      };
    }

    return {
      valid: true,
      solution: {
        assignment,
        calculatedDifficulty: calculated.difficulty,
        metrics: calculated.metrics,
        exploredAssignments: outcome.exploredAssignments,
      },
      checks,
    };
  }
}

export const mathematicalEquationValidator = new MathematicalEquationValidator();

