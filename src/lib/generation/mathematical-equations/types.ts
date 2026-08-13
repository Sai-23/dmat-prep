import type {
  GenerationCandidate,
  GenerationConfiguration,
  GeneratedQuestion,
  GenerationDifficulty,
  ValidationIssue,
} from "../types";

export const MATHEMATICAL_EQUATION_GENERATOR_VERSION = "mathematical-equations@4.0.0";
export const MATHEMATICAL_EQUATION_SOLVER_VERSION = "mathematical-equations-solver@2.0.0";
export const MATHEMATICAL_EQUATION_VALIDATOR_VERSION = "mathematical-equations-validator@4.0.0";
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

export type EquationStructuralFamily =
  | "direct_chain"
  | "sum_difference"
  | "multiply_then_derive"
  | "divide_then_derive"
  | "three_variable_chain"
  | "shared_source"
  | "branch_then_combine"
  | "compound_derived_variable"
  | "four_variable_chain"
  | "shared_source_branch"
  | "branch_and_recombine"
  | "multi_dependency_system"
  | "compound_four_variable"
  | "low_direct_chain"
  | "low_sum_difference"
  | "low_scaled_pair"
  | "low_divide_pair"
  | "medium_branch"
  | "medium_recombine"
  | "medium_cross_dependency"
  | "medium_compound_chain"
  | "medium_shared_source_recombine"
  | "high_branch_recombine"
  | "high_cross_dependency"
  | "high_multi_stage"
  | "high_compound_system"
  | "high_two_stage_recombine"
  | "high_mixed_dependency"
  | "easy_sum_difference"
  | "easy_multiplier_difference"
  | "easy_division_difference"
  | "easy_scaled_total"
  | "medium_hidden_difference"
  | "medium_hidden_sum"
  | "medium_reverse_relationship"
  | "medium_mixed_grouping"
  | "hard_two_groups"
  | "hard_dependency_chain"
  | "hard_nested_dependency"
  | "hard_group_bridge";

export type EquationDependencyModel = {
  family: EquationStructuralFamily;
  solveOrder: EquationVariable[];
  edges: Array<{ source: EquationVariable; target: EquationVariable }>;
  hiddenGroupingCount?: number;
  relationshipReversalCount?: number;
  meaningfulReasoningSteps?: number;
};

export type MathematicalEquationStructuredData = {
  variables: EquationVariable[];
  equations: MathematicalEquation[];
  domain: {
    minimum: number;
    maximum: number;
    integersOnly: true;
  };
  dependencyModel: EquationDependencyModel;
};

export type VariableAssignment = { [symbol: string]: number };

export type EquationSolutionStep = {
  equationIndex: number;
  supportingEquationIndices?: number[];
  targetSymbol: string;
  knownSymbols: string[];
  dependencySymbols?: string[];
  reasoning?: "solve_variable" | "substitute" | "combine_equations";
};

export type MathematicalEquationCandidate = GenerationCandidate<
  MathematicalEquationStructuredData,
  VariableAssignment
> & {
  questionType: "mathematical_equation";
  module: "core";
  solutionPath: EquationSolutionStep[];
  reasoningPath: string[];
  fastestMethod: string;
};

export type MathematicalEquationQuestion = GeneratedQuestion<
  MathematicalEquationStructuredData,
  VariableAssignment
> & {
  questionType: "mathematical_equation";
  module: "core";
  solutionPath: EquationSolutionStep[];
  reasoningPath: string[];
  fastestMethod: string;
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
  branchingFactor: number;
  branchCount: number;
  recombinationCount: number;
  indirectCouplingCount: number;
  substitutionCount: number;
  operatorVariety: number;
  compoundExpressionCount: number;
  solveStepCount: number;
  operationCount: number;
  coefficientComplexity: number;
  directEntryPointCount: number;
  obviousEntryPointPenalty: number;
  workingMemoryEstimate: number;
  hiddenGroupingCount: number;
  relationshipReversalCount: number;
  meaningfulReasoningSteps: number;
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
