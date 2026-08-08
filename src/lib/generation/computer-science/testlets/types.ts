import type { GenerationDifficulty, JsonValue } from "../../types";

export const SUBJECT_TESTLET_SCHEMA_VERSION = 1;
export const SUBJECT_TESTLET_VALIDATOR_VERSION = "subject-testlet-validator@1.0.0";
export const SUBJECT_TESTLET_FINGERPRINT_VERSION = "subject-testlet-fingerprint@1.0.0";

export const COMPUTER_SCIENCE_MODULES = [
  "programming",
  "data_structures",
  "algorithms",
  "databases",
  "operating_systems",
  "computer_networks",
  "software_engineering",
  "computer_security",
  "boolean_logic",
] as const;
export type ComputerScienceModule = (typeof COMPUTER_SCIENCE_MODULES)[number];

export const TESTLET_REASONING_ROLES = [
  "direct_application", "interpretation", "tracing", "calculation", "state_prediction",
  "scenario_transfer", "comparison", "consequence", "error_detection",
  "alternative_representation", "output_prediction", "structure_interpretation",
  "algorithm_selection", "complexity_reasoning", "synthesis",
] as const;
export type TestletReasoningRole = (typeof TESTLET_REASONING_ROLES)[number];

export const VERIFICATION_CLASSES = ["A", "B", "C"] as const;
export type VerificationClass = (typeof VERIFICATION_CLASSES)[number];
export type ContentReviewStatus = "validated" | "needs_review" | "approved" | "rejected" | "published";

type BlockBase = { id: string };
export type SubjectStimulusBlock =
  | (BlockBase & { kind: "paragraph"; text: string })
  | (BlockBase & { kind: "code" | "pseudocode"; code: string; language?: string })
  | (BlockBase & { kind: "formula"; expression: string })
  | (BlockBase & { kind: "table" | "diagram" | "graph" | "circuit" | "matrix" | "process_table" | "network_table" | "er_diagram" | "uml_diagram"; data: JsonValue });

export type SubjectTestletOption = { id: string; label: string; content: JsonValue; distractorReason?: string };
export type SubjectTestletQuestion = {
  id: string;
  questionText: string;
  family: string;
  reasoningRole: TestletReasoningRole;
  verificationClass?: VerificationClass;
  stimulusBlockIds: string[];
  difficulty: GenerationDifficulty;
  options: [SubjectTestletOption, SubjectTestletOption, SubjectTestletOption, SubjectTestletOption];
  correctOptionId: string;
  explanation: string;
  semanticParameters: JsonValue;
  validation: {
    solverVersion: string;
    verifiedCorrectOptionId: string;
    explanationVerified: boolean;
    ambiguous: boolean;
  };
};

export type SubjectTestletMetadata = {
  testletId: string;
  stimulusTypes: SubjectStimulusBlock["kind"][];
  questionCount: number;
  questionFamilies: string[];
  overallDifficulty: GenerationDifficulty;
  seed: string;
  generatorVersion: string;
  validatorVersion: string;
  fingerprint: string;
  generationAttempts: number;
  childFingerprints: string[];
  semanticParameters: JsonValue;
  semanticFingerprint?: string;
  promptVersion?: string;
  modelIdentifier?: string;
  reviewStatus?: ContentReviewStatus;
};

export type SubjectTestlet = {
  schemaVersion: typeof SUBJECT_TESTLET_SCHEMA_VERSION;
  id: string;
  module: ComputerScienceModule;
  topic: string;
  subtopic: string;
  overallDifficulty: GenerationDifficulty;
  stimulus: { id: string; title: string; blocks: SubjectStimulusBlock[] };
  questions: SubjectTestletQuestion[];
  metadata: SubjectTestletMetadata;
};

export type SubjectTestletValidationConfiguration = { minimumQuestions?: number; maximumQuestions?: number; minimumReasoningRoles?: number };
export type SubjectTestletValidationIssue = { code: string; message: string; questionId?: string };
export type SubjectTestletValidationResult = { valid: true; childFingerprints: string[]; testletFingerprint: string } | { valid: false; issues: SubjectTestletValidationIssue[] };
