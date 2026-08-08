import type {
  GenerationConfiguration,
  GenerationDifficulty,
  GenerationMetadata,
  JsonValue,
  PresentationBlock,
  ValidationMetadata,
} from "../types";

export const COMPUTER_SCIENCE_UNIT_SCHEMA_VERSION = 1;
export const COMPUTER_SCIENCE_ARCHITECTURE_VALIDATOR_VERSION =
  "computer-science-architecture@1.0.0";

export type ComputerScienceStimulus = {
  id: string;
  title?: string;
  blocks: PresentationBlock[];
};

export type ComputerScienceAnswerOption = {
  id: string;
  label: string;
  content: JsonValue;
};

export type ComputerScienceQuestion = {
  id: string;
  topic: string;
  subtopic?: string;
  difficulty: GenerationDifficulty;
  prompt: string;
  blocks: PresentationBlock[];
  options: [
    ComputerScienceAnswerOption,
    ComputerScienceAnswerOption,
    ComputerScienceAnswerOption,
    ComputerScienceAnswerOption,
  ];
  correctOptionId: string;
  explanation: string;
  estimatedSolveTimeSeconds: number;
};

export type ComputerScienceSubjectUnit = {
  schemaVersion: typeof COMPUTER_SCIENCE_UNIT_SCHEMA_VERSION;
  module: "computer_science";
  subject: "computer_science";
  topic: string;
  stimulus: ComputerScienceStimulus;
  questions: ComputerScienceQuestion[];
};

export type GeneratedComputerScienceSubjectUnit = ComputerScienceSubjectUnit & {
  metadata: GenerationMetadata;
  validation: ValidationMetadata;
};

export const BOOLEAN_LOGIC_GENERATOR_VERSION = "boolean-logic@1.0.0";
export const BOOLEAN_LOGIC_SOLVER_VERSION = "boolean-logic-solver@1.0.0";
export const BOOLEAN_LOGIC_VALIDATOR_VERSION = "boolean-logic-validator@1.0.0";

export type BooleanVariable = { kind: "variable"; name: string };
export type BooleanNotExpression = { kind: "not"; operand: BooleanExpression };
export type BooleanBinaryExpression = {
  kind: "binary";
  operator: "and" | "or" | "xor" | "implies";
  left: BooleanExpression;
  right: BooleanExpression;
};
export type BooleanExpression =
  | BooleanVariable
  | BooleanNotExpression
  | BooleanBinaryExpression;

export type BooleanAssignment = Record<string, boolean>;
export type BooleanLogicExpressionDefinition = {
  id: string;
  expression: BooleanExpression;
};
export type BooleanLogicStructuredData = {
  family: "boolean_truth_tables";
  variables: string[];
  rowOrder: BooleanAssignment[];
  expressions: BooleanLogicExpressionDefinition[];
};
export type BooleanLogicUnitCandidate = ComputerScienceSubjectUnit & {
  family: "boolean_truth_tables";
  structuredData: BooleanLogicStructuredData;
};
export type BooleanLogicGeneratedUnit = BooleanLogicUnitCandidate & {
  metadata: GenerationMetadata;
  validation: ValidationMetadata;
};
export type BooleanLogicGenerationConfiguration = GenerationConfiguration & {
  difficulty: "easy" | "medium" | "hard";
};
export type BooleanLogicDifficultyMetrics = {
  variableCount: number;
  maximumOperatorCount: number;
  maximumDepth: number;
  score: number;
};
export type BooleanLogicSolution = {
  signatures: string[];
  correctOptionIds: string[];
  calculatedDifficulty: GenerationDifficulty;
  metrics: BooleanLogicDifficultyMetrics;
  explanations: string[];
};

export type ComputerScienceUnitValidationSolution = {
  questionCount: number;
  correctOptionIds: string[];
};

export const COMBINATIONAL_CIRCUIT_GENERATOR_VERSION = "combinational-circuits@1.0.0";
export const COMBINATIONAL_CIRCUIT_SOLVER_VERSION = "combinational-circuits-solver@1.0.0";
export const COMBINATIONAL_CIRCUIT_VALIDATOR_VERSION = "combinational-circuits-validator@1.0.0";

export type CircuitGate = {
  id: string;
  operator: "and" | "or" | "xor" | "not";
  inputs: [string] | [string, string];
};
export type CircuitScenario = { id: string; assignment: BooleanAssignment };
export type CombinationalCircuitStructuredData = {
  family: "combinational_circuits";
  inputs: string[];
  gates: CircuitGate[];
  outputs: [string, string];
  scenarios: CircuitScenario[];
};
export type CombinationalCircuitUnitCandidate = ComputerScienceSubjectUnit & {
  family: "combinational_circuits";
  structuredData: CombinationalCircuitStructuredData;
};
export type CombinationalCircuitGeneratedUnit = CombinationalCircuitUnitCandidate & {
  metadata: GenerationMetadata;
  validation: ValidationMetadata;
};
export type CombinationalCircuitGenerationConfiguration = GenerationConfiguration & {
  difficulty: "easy" | "medium" | "hard";
};
export type CombinationalCircuitDifficultyMetrics = {
  inputCount: number;
  gateCount: number;
  maximumDepth: number;
  score: number;
};
export type CombinationalCircuitSolution = {
  outputSignatures: string[];
  correctOptionIds: string[];
  calculatedDifficulty: GenerationDifficulty;
  metrics: CombinationalCircuitDifficultyMetrics;
  explanations: string[];
};

export type GeneratedComputerScienceUnit =
  | BooleanLogicGeneratedUnit
  | CombinationalCircuitGeneratedUnit
  | import("./testlets").GeneratedLogicSubjectTestlet;
export type ComputerScienceFamily = "boolean_truth_tables" | "combinational_circuits" | "programming_trace" | "programming_recursion" | "programming_oop";
