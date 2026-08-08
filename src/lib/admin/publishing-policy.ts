import type { UserRole } from "@/types/auth";

export type PublicationCandidate = {
  verificationStatus: string;
  questionType: string;
  sourceType: string;
  optionCount: number;
  correctOptionId: string | null;
  structuredData: unknown;
  metadata: unknown;
};

export type PublicationDecision = { allowed: true } | { allowed: false; reason: string };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validatedGeneration(metadataValue: unknown): boolean {
  const metadata = record(metadataValue);
  const generation = record(metadata?.generation);
  const validation = record(metadata?.validation);
  const checks = Array.isArray(validation?.checks) ? validation.checks : [];
  return (
    typeof generation?.seed === "string" && generation.seed.length > 0 &&
    typeof generation?.generatorVersion === "string" && generation.generatorVersion.length > 0 &&
    typeof generation?.validatorVersion === "string" && generation.validatorVersion.length > 0 &&
    typeof generation?.fingerprint === "string" && generation.fingerprint.length > 0 &&
    validation?.valid === true &&
    checks.length > 0 &&
    checks.every((item) => record(item)?.passed === true)
  );
}

function nativeResponseMatches(questionType: string, structuredValue: unknown): boolean {
  const structured = record(structuredValue);
  const response = record(structured?.response);
  if (questionType === "mathematical_equation") return response?.kind === "symbol_assignment";
  if (questionType === "latin_square") return response?.kind === "single_choice" && Array.isArray(response.options) && response.options.length === 5;
  if (questionType === "figure_sequence") return response?.kind === "two_stage_single_choice" && Array.isArray(response.stages) && response.stages.length === 2;
  if (questionType === "computer_science") {
    const questions = structured?.questions;
    return Array.isArray(questions) && questions.length > 0 && questions.every((question) => {
      const child = record(question);
      const options = child?.options;
      return Array.isArray(options) && options.length === 4 && options.some((option) => record(option)?.id === child?.correctOptionId);
    });
  }
  return false;
}

export function evaluatePublication(candidate: PublicationCandidate): PublicationDecision {
  if (candidate.verificationStatus !== "approved") {
    return { allowed: false, reason: "Only approved questions can be published." };
  }
  if (candidate.sourceType === "generated") {
    if (!validatedGeneration(candidate.metadata)) {
      return { allowed: false, reason: "Generated content requires complete provenance and passed validation checks." };
    }
    if (!nativeResponseMatches(candidate.questionType, candidate.structuredData)) {
      return { allowed: false, reason: "The generated question does not contain its required native response structure." };
    }
    return { allowed: true };
  }
  if (candidate.optionCount !== 4 || !candidate.correctOptionId) {
    return { allowed: false, reason: "Conventional questions require four options and one correct option." };
  }
  return { allowed: true };
}

export function canAccessPrivateQuestionBank(roles: readonly UserRole[]): boolean {
  return roles.includes("reviewer") || roles.includes("admin");
}

export function canMakeReviewDecision(roles: readonly UserRole[]): boolean {
  return canAccessPrivateQuestionBank(roles);
}

export function canManageQuestionLifecycle(roles: readonly UserRole[]): boolean {
  return roles.includes("admin");
}
