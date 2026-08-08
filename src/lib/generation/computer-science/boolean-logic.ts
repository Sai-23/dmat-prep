import { canonicalize, createFingerprint } from "../fingerprint";
import { SeededRandom } from "../random";
import type { GenerationDifficulty, ValidationCheck, ValidationIssue, ValidationResult } from "../types";
import { validateComputerScienceSubjectUnit } from "./validation";
import {
  BOOLEAN_LOGIC_GENERATOR_VERSION,
  BOOLEAN_LOGIC_SOLVER_VERSION,
  BOOLEAN_LOGIC_VALIDATOR_VERSION,
  type BooleanAssignment,
  type BooleanExpression,
  type BooleanLogicDifficultyMetrics,
  type BooleanLogicGeneratedUnit,
  type BooleanLogicGenerationConfiguration,
  type BooleanLogicSolution,
  type BooleanLogicUnitCandidate,
  type ComputerScienceAnswerOption,
} from "./types";

const BINARY_OPERATORS = ["and", "or", "xor", "implies"] as const;
const ESTIMATED_SECONDS = { easy: 50, medium: 75, hard: 105 } as const;

export function evaluateBooleanExpression(expression: BooleanExpression, assignment: BooleanAssignment): boolean {
  if (expression.kind === "variable") {
    if (!(expression.name in assignment)) throw new Error(`Missing Boolean variable ${expression.name}.`);
    return assignment[expression.name];
  }
  if (expression.kind === "not") return !evaluateBooleanExpression(expression.operand, assignment);
  const left = evaluateBooleanExpression(expression.left, assignment);
  const right = evaluateBooleanExpression(expression.right, assignment);
  if (expression.operator === "and") return left && right;
  if (expression.operator === "or") return left || right;
  if (expression.operator === "xor") return left !== right;
  return !left || right;
}

export function booleanExpressionText(expression: BooleanExpression): string {
  if (expression.kind === "variable") return expression.name;
  if (expression.kind === "not") return `¬(${booleanExpressionText(expression.operand)})`;
  const symbol = { and: "∧", or: "∨", xor: "⊕", implies: "→" }[expression.operator];
  return `(${booleanExpressionText(expression.left)} ${symbol} ${booleanExpressionText(expression.right)})`;
}

function expressionMetrics(expression: BooleanExpression): { operators: number; depth: number } {
  if (expression.kind === "variable") return { operators: 0, depth: 0 };
  if (expression.kind === "not") {
    const nested = expressionMetrics(expression.operand);
    return { operators: nested.operators + 1, depth: nested.depth + 1 };
  }
  const left = expressionMetrics(expression.left);
  const right = expressionMetrics(expression.right);
  return { operators: left.operators + right.operators + 1, depth: Math.max(left.depth, right.depth) + 1 };
}

export function calculateBooleanLogicDifficulty(candidate: BooleanLogicUnitCandidate): {
  difficulty: GenerationDifficulty;
  metrics: BooleanLogicDifficultyMetrics;
} {
  const metrics = candidate.structuredData.expressions.map((item) => expressionMetrics(item.expression));
  const maximumOperatorCount = Math.max(...metrics.map((item) => item.operators));
  const maximumDepth = Math.max(...metrics.map((item) => item.depth));
  const variableCount = candidate.structuredData.variables.length;
  const score = maximumOperatorCount * 2 + maximumDepth + Math.max(0, variableCount - 2);
  return {
    difficulty: score <= 3 ? "easy" : score <= 8 ? "medium" : "hard",
    metrics: { variableCount, maximumOperatorCount, maximumDepth, score },
  };
}

function assignments(variables: string[]): BooleanAssignment[] {
  return Array.from({ length: 2 ** variables.length }, (_, row) =>
    Object.fromEntries(variables.map((variable, index) => [variable, Boolean(row & (1 << (variables.length - index - 1)))])),
  );
}

function variable(name: string): BooleanExpression { return { kind: "variable", name }; }
function binary(operator: (typeof BINARY_OPERATORS)[number], left: BooleanExpression, right: BooleanExpression): BooleanExpression {
  return { kind: "binary", operator, left, right };
}

function expressionFor(difficulty: "easy" | "medium" | "hard", random: SeededRandom, offset: number): BooleanExpression {
  const operator = () => BINARY_OPERATORS[(random.integer(0, BINARY_OPERATORS.length - 1) + offset) % BINARY_OPERATORS.length];
  if (difficulty === "easy") return binary(operator(), variable("A"), variable("B"));
  if (difficulty === "medium") return binary(operator(), binary(operator(), variable("A"), variable("B")), variable("C"));
  return binary(
    operator(),
    { kind: "not", operand: binary(operator(), variable("A"), variable("B")) },
    binary(operator(), variable("C"), { kind: "not", operand: variable("A") }),
  );
}

function signature(expression: BooleanExpression, rows: BooleanAssignment[]): string {
  return rows.map((row) => evaluateBooleanExpression(expression, row) ? "T" : "F").join("");
}

function optionsFor(correct: string, random: SeededRandom, questionIndex: number): [ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption] {
  const variants = new Set<string>();
  variants.add(correct.split("").map((value) => value === "T" ? "F" : "T").join(""));
  variants.add([...correct].reverse().join(""));
  for (let index = 0; index < correct.length; index += 1) {
    variants.add(correct.slice(0, index) + (correct[index] === "T" ? "F" : "T") + correct.slice(index + 1));
  }
  variants.delete(correct);
  const distractors = random.shuffle([...variants]).slice(0, 3);
  if (distractors.length !== 3) throw new Error("Unable to create three unique truth-table distractors.");
  return random.shuffle([correct, ...distractors]).map((content, index) => ({
    id: `q${questionIndex + 1}-option-${index + 1}`,
    label: String.fromCharCode(65 + index),
    content,
  })) as [ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption];
}

export function generateBooleanLogicCandidate(configuration: BooleanLogicGenerationConfiguration, attempt: number): BooleanLogicUnitCandidate {
  if (!configuration.seed.trim()) throw new Error("A non-empty Boolean-logic seed is required.");
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError("Generation attempt must be positive.");
  const random = new SeededRandom(`${BOOLEAN_LOGIC_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${canonicalize(configuration.options ?? {})}\u001f${attempt}`);
  const variables = configuration.difficulty === "easy" ? ["A", "B"] : ["A", "B", "C"];
  const rowOrder = assignments(variables);
  const expressions = [0, 1].map((index) => ({ id: `E${index + 1}`, expression: expressionFor(configuration.difficulty, random.fork(`expression-${index}`), index) }));
  const questions = expressions.map((definition, index) => {
    const correct = signature(definition.expression, rowOrder);
    const options = optionsFor(correct, random.fork(`options-${index}`), index);
    return {
      id: `question-${index + 1}`,
      topic: "Boolean Logic",
      subtopic: "Truth tables",
      difficulty: configuration.difficulty,
      prompt: `Which output column is produced by ${definition.id}?`,
      blocks: [],
      options,
      correctOptionId: options.find((option) => option.content === correct)!.id,
      explanation: "The validator must independently calculate this output column.",
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
    };
  });
  return {
    schemaVersion: 1,
    module: "computer_science",
    subject: "computer_science",
    topic: "Boolean Logic",
    family: "boolean_truth_tables",
    stimulus: {
      id: "boolean-stimulus",
      title: "Boolean expressions and row order",
      blocks: [
        { kind: "text", text: "For each expression, select its complete output column in the row order shown." },
        { kind: "table", data: { variables, rows: rowOrder.map((row) => variables.map((name) => row[name] ? "T" : "F")) } },
        { kind: "formula", expression: expressions.map((item) => `${item.id} = ${booleanExpressionText(item.expression)}`).join("    ") },
      ],
    },
    questions,
    structuredData: { family: "boolean_truth_tables", variables, rowOrder, expressions },
  };
}

export function solveBooleanLogic(candidate: BooleanLogicUnitCandidate): Omit<BooleanLogicSolution, "calculatedDifficulty" | "metrics" | "explanations"> {
  const signatures = candidate.structuredData.expressions.map((item) => signature(item.expression, candidate.structuredData.rowOrder));
  const correctOptionIds = signatures.map((value, index) => {
    const matches = candidate.questions[index]?.options.filter((option) => option.content === value) ?? [];
    if (matches.length !== 1) throw new Error(`Question ${index + 1} does not contain exactly one computed truth-table output.`);
    return matches[0].id;
  });
  return { signatures, correctOptionIds };
}

function validationCheck(stage: ValidationCheck["stage"], passed: boolean, details?: ValidationCheck["details"]): ValidationCheck {
  return { stage, passed, validatorVersion: BOOLEAN_LOGIC_VALIDATOR_VERSION, ...(details === undefined ? {} : { details }) };
}

export function validateBooleanLogic(candidate: BooleanLogicUnitCandidate, requestedDifficulty: GenerationDifficulty): ValidationResult<BooleanLogicSolution> {
  const structural = validateComputerScienceSubjectUnit(candidate);
  const checks: ValidationCheck[] = structural.checks.map((item) => ({ ...item, validatorVersion: BOOLEAN_LOGIC_VALIDATOR_VERSION }));
  if (!structural.valid || candidate.structuredData.family !== "boolean_truth_tables" || candidate.questions.length !== candidate.structuredData.expressions.length) {
    return { valid: false, issues: structural.valid ? [{ stage: "format", code: "boolean_structure_mismatch", message: "Expressions and questions must correspond one-to-one." }] : structural.issues, checks };
  }
  const { variables, rowOrder, expressions } = candidate.structuredData;
  const expectedRows = assignments(variables);
  const domainValid =
    (variables.length === 2 || variables.length === 3) &&
    new Set(variables).size === variables.length &&
    JSON.stringify(rowOrder) === JSON.stringify(expectedRows) &&
    new Set(expressions.map((item) => item.id)).size === expressions.length &&
    new Set(expressions.map((item) => canonicalize(item.expression))).size === expressions.length &&
    candidate.questions.every((question) => {
      const values = question.options.map((option) => option.content);
      return (
        question.difficulty === requestedDifficulty &&
        values.every((value) => typeof value === "string" && value.length === rowOrder.length && /^[TF]+$/.test(value)) &&
        new Set(values.map(String)).size === 4
      );
    });
  checks.push(validationCheck("domain", domainValid));
  if (!domainValid) {
    return { valid: false, issues: [{ stage: "domain", code: "invalid_boolean_domain", message: "Variables, truth-table rows, expressions, or answer columns violate the Boolean family domain." }], checks };
  }
  let solved;
  try { solved = solveBooleanLogic(candidate); }
  catch (error) {
    checks.push(validationCheck("solve", false));
    return { valid: false, issues: [{ stage: "solve", code: "boolean_solve_failed", message: error instanceof Error ? error.message : "Unable to solve Boolean expressions." }], checks };
  }
  checks.push(validationCheck("solve", true, { solverVersion: BOOLEAN_LOGIC_SOLVER_VERSION }));
  const storedMatches = solved.correctOptionIds.every((id, index) => id === candidate.questions[index].correctOptionId);
  checks.push(validationCheck("uniqueness", storedMatches));
  if (!storedMatches) return { valid: false, issues: [{ stage: "uniqueness", code: "boolean_answer_mismatch", message: "A stored answer differs from the independently evaluated expression." }], checks };
  const calculated = calculateBooleanLogicDifficulty(candidate);
  const difficultyMatches = calculated.difficulty === requestedDifficulty;
  checks.push(validationCheck("difficulty", difficultyMatches, calculated.metrics));
  if (!difficultyMatches) return { valid: false, issues: [{ stage: "difficulty", code: "difficulty_mismatch", message: `Requested ${requestedDifficulty}, calculated ${calculated.difficulty}.` }], checks };
  const explanations = solved.signatures.map((value, index) => `${candidate.structuredData.expressions[index].id} evaluates row by row to ${value}.`);
  checks.push(validationCheck("explanation", true));
  return { valid: true, solution: { ...solved, calculatedDifficulty: calculated.difficulty, metrics: calculated.metrics, explanations }, checks };
}

export function fingerprintBooleanLogic(candidate: BooleanLogicUnitCandidate): string {
  return createFingerprint("computer-science-boolean", {
    variables: candidate.structuredData.variables,
    rowOrder: candidate.structuredData.rowOrder,
    expressions: candidate.structuredData.expressions.map((item) => item.expression),
  });
}

const MAX_ATTEMPTS = 5_000;
export function generateValidatedBooleanLogicUnit(configuration: BooleanLogicGenerationConfiguration, acceptedFingerprints: ReadonlySet<string> = new Set()): BooleanLogicGeneratedUnit {
  const maxAttempts = configuration.maxAttempts ?? 500;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) throw new RangeError(`maxAttempts must be from 1 through ${MAX_ATTEMPTS}.`);
  let lastIssues: ValidationIssue[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const candidate = generateBooleanLogicCandidate(configuration, attempt);
      const validation = validateBooleanLogic(candidate, configuration.difficulty);
      if (!validation.valid) { lastIssues = validation.issues; continue; }
      const fingerprint = fingerprintBooleanLogic(candidate);
      if (acceptedFingerprints.has(fingerprint)) { lastIssues = [{ stage: "duplicate", code: "duplicate_fingerprint", message: "Duplicate Boolean-logic structure." }]; continue; }
      const timestamp = new Date().toISOString();
      const questions = candidate.questions.map((question, index) => ({ ...question, explanation: validation.solution.explanations[index] }));
      return {
        ...candidate,
        questions,
        metadata: { seed: configuration.seed, generatorVersion: BOOLEAN_LOGIC_GENERATOR_VERSION, validatorVersion: BOOLEAN_LOGIC_VALIDATOR_VERSION, requestedDifficulty: configuration.difficulty, calculatedDifficulty: validation.solution.calculatedDifficulty, generatedAt: timestamp, attemptCount: attempt, fingerprint },
        validation: { valid: true, validatedAt: timestamp, checks: [...validation.checks, validationCheck("duplicate", true, { fingerprint })] },
      };
    } catch (error) {
      lastIssues = [{ stage: "safety", code: "boolean_construction_failed", message: error instanceof Error ? error.message : "Construction failed." }];
    }
  }
  throw new Error(`Unable to generate validated Boolean logic in ${maxAttempts} attempts: ${lastIssues.at(-1)?.message ?? "unknown failure"}`);
}

export function reproduceValidatedBooleanLogicUnit(configuration: BooleanLogicGenerationConfiguration, attempt: number): BooleanLogicGeneratedUnit {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_ATTEMPTS) throw new RangeError(`attempt must be from 1 through ${MAX_ATTEMPTS}.`);
  const candidate = generateBooleanLogicCandidate(configuration, attempt);
  const validation = validateBooleanLogic(candidate, configuration.difficulty);
  if (!validation.valid) throw new Error(validation.issues[0]?.message ?? "Reproduction failed validation.");
  const timestamp = new Date().toISOString();
  const fingerprint = fingerprintBooleanLogic(candidate);
  return { ...candidate, questions: candidate.questions.map((question, index) => ({ ...question, explanation: validation.solution.explanations[index] })), metadata: { seed: configuration.seed, generatorVersion: BOOLEAN_LOGIC_GENERATOR_VERSION, validatorVersion: BOOLEAN_LOGIC_VALIDATOR_VERSION, requestedDifficulty: configuration.difficulty, calculatedDifficulty: validation.solution.calculatedDifficulty, generatedAt: timestamp, attemptCount: attempt, fingerprint }, validation: { valid: true, validatedAt: timestamp, checks: [...validation.checks, validationCheck("duplicate", true, { fingerprint })] } };
}
