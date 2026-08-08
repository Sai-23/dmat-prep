import type {
  GenerationCandidate,
  GenerationConfiguration,
  GeneratedQuestion,
  GenerationDifficulty,
  ValidationIssue,
} from "../types";

export const MATHEMATICAL_EQUATION_GENERATOR_VERSION = "mathematical-equations@1.0.0";
export const MATHEMATICAL_EQUATION_SOLVER_VERSION = "mathematical-equations-solver@1.0.0";
export const MATHEMATICAL_EQUATION_VALIDATOR_VERSION = "mathematical-equations-validator@1.0.0";
export const MATHEMATICAL_EQUATION_DOMAIN = { minimum: 1, maximum: 20 } as const;

export type EquationVariable = string;
export type EquationOperator = "add" | "subtract" | "multiply" | "divide";

export type MathematicalExpression =
  | { kind: "constant"; value: number }
  | { kind: "variable"; symbol: EquationVariable }
  | {
      kind: "operation";
      operator: EquationOperator;
      left: MathematicalExpression;
      right: MathematicalExpression;
    };

export type MathematicalEquation = {
  left: MathematicalExpression;
  right: MathematicalExpression;
};

export type MathematicalEquationStructuredData = {
  variables: EquationVariable[];
  equations: MathematicalEquation[];
  domain: {
    minimum: number;
    maximum: number;
    integersOnly: true;
  };
};

export type VariableAssignment = { [symbol: string]: number };

export type EquationSolutionStep = {
  equationIndex: number;
  targetSymbol: string;
  knownSymbols: string[];
};

export type MathematicalEquationCandidate = GenerationCandidate<
  MathematicalEquationStructuredData,
  VariableAssignment
> & {
  questionType: "mathematical_equation";
  module: "core";
  solutionPath: EquationSolutionStep[];
};

export type MathematicalEquationQuestion = GeneratedQuestion<
  MathematicalEquationStructuredData,
  VariableAssignment
> & {
  questionType: "mathematical_equation";
  module: "core";
  solutionPath: EquationSolutionStep[];
};

export type MathematicalEquationGenerationConfiguration = GenerationConfiguration & {
  difficulty: "easy" | "medium" | "hard";
};

export type EquationSolverOutcome = {
  status: "none" | "unique" | "multiple" | "invalid";
  solutions: VariableAssignment[];
  exploredAssignments: number;
  reason: string | null;
};

export type EquationDifficultyMetrics = {
  variableCount: number;
  equationCount: number;
  dependencyDepth: number;
  operationCount: number;
  coefficientComplexity: number;
  score: number;
};

export type MathematicalEquationValidationSolution = {
  assignment: VariableAssignment;
  calculatedDifficulty: GenerationDifficulty;
  metrics: EquationDifficultyMetrics;
  exploredAssignments: number;
};

export type MathematicalEquationGenerationFailure = {
  attempts: number;
  lastIssues: ValidationIssue[];
};
