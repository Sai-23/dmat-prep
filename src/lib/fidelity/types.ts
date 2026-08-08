import type { GenerationDifficulty, GeneratedQuestionType, JsonValue } from "@/lib/generation";

export const FIDELITY_SCORE_FIELDS = [
  "correctness",
  "formatFidelity",
  "clarity",
  "difficultyAppropriateness",
  "ambiguity",
  "mentalWorkloadAppropriateness",
  "overallQuality",
] as const;

export type FidelityScoreField = (typeof FIDELITY_SCORE_FIELDS)[number];
export type FidelityScores = Record<FidelityScoreField, number>;

export type FidelityAuditSample = {
  sampleId: string;
  questionType: Exclude<GeneratedQuestionType, "computer_science">;
  difficulty: GenerationDifficulty;
  seed: string;
  generatorVersion: string;
  validatorVersion: string;
  fingerprint: string;
  generatedSnapshot: JsonValue;
};

export type FidelityReview = {
  sampleId: string;
  reviewerId: string;
  scores: FidelityScores;
  difficultyAgreement: boolean;
  ambiguityFlag: boolean;
  taskSpecific: Record<string, boolean | number | string>;
  comments: string;
};

export type FidelitySummaryRow = {
  questionType: FidelityAuditSample["questionType"];
  difficulty: GenerationDifficulty;
  generatorVersion: string;
  reviewCount: number;
  meanReviewerScore: number | null;
  meanFormatFidelityScore: number | null;
  difficultyAgreementRate: number | null;
  ambiguityFlagCount: number;
  comments: string[];
};
