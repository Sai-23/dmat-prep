import { z } from "zod";
import { canonicalize } from "../../fingerprint";
import { fingerprintSubjectTestlet, fingerprintSubjectTestletQuestion } from "./fingerprint";
import { semanticFingerprintSubjectTestlet } from "./diversity";
import type { SubjectTestlet } from "./types";
import { validateSubjectTestlet } from "./validation";

export const HYBRID_PRESENTATION_PROMPT_VERSION = "cs-presentation@1.0.0";
export const HYBRID_CRITIC_PROMPT_VERSION = "cs-critic@1.0.0";

const optionSchema = z.object({ id: z.string().min(1), valueToken: z.string().min(1), displayText: z.string().trim().min(1).max(300) }).strict();
const questionSchema = z.object({ id: z.string().min(1), family: z.string().min(1), reasoningRole: z.string().min(1), verificationClass: z.enum(["A", "B", "C"]), prompt: z.string().trim().min(1).max(1_500), options: z.array(optionSchema).length(4), explanation: z.string().trim().min(1).max(2_000) }).strict();
export const aiPresentationSchema = z.object({ title: z.string().trim().min(1).max(300), scenario: z.string().trim().min(1).max(2_000), questions: z.array(questionSchema).min(4).max(8) }).strict();
export type AiPresentation = z.infer<typeof aiPresentationSchema>;

export const criticResultSchema = z.object({ decision: z.enum(["PASS", "FAIL", "REQUIRES_HUMAN_REVIEW"]), reasonCodes: z.array(z.enum(["technical_conflict", "technically_incorrect", "ambiguous_wording", "multiple_correct_risk", "insufficient_stimulus", "topic_mismatch", "format_fidelity", "poor_fidelity", "unclear_wording", "weak_distractor", "insufficient_diversity", "semantic_repetition", "repetitive", "memory_only", "difficulty_mismatch"])), summary: z.string().trim().min(1).max(1_000) }).strict();
export type CriticResult = z.infer<typeof criticResultSchema>;

export function presentationContract(testlet: SubjectTestlet) {
  return { testletId: testlet.id, module: testlet.module, topic: testlet.topic, difficulty: testlet.overallDifficulty, immutableProblemState: testlet.metadata.semanticParameters, questions: testlet.questions.map((question) => ({ id: question.id, family: question.family, reasoningRole: question.reasoningRole, verificationClass: question.verificationClass ?? "A", options: question.options.map((option) => ({ id: option.id, valueToken: canonicalize(option.content), verifiedValue: option.content })), correctOptionId: question.correctOptionId })) };
}

export function applyAiPresentation(testlet: SubjectTestlet, raw: unknown, provenance: { model: string; promptVersion?: string }): SubjectTestlet {
  const presentation = aiPresentationSchema.parse(raw);
  if (presentation.questions.length !== testlet.questions.length) throw new Error("AI_CHANGED_QUESTION_PLAN");
  const next = structuredClone(testlet);
  next.stimulus.title = presentation.title;
  const scenario = next.stimulus.blocks.find((block) => block.kind === "paragraph");
  if (!scenario || scenario.kind !== "paragraph") throw new Error("UNSUPPORTED_PRESENTATION_STRUCTURE");
  scenario.text = presentation.scenario;
  next.questions.forEach((question) => {
    const candidate = presentation.questions.find((item) => item.id === question.id);
    if (!candidate || candidate.family !== question.family || candidate.reasoningRole !== question.reasoningRole || candidate.verificationClass !== (question.verificationClass ?? "A")) throw new Error("AI_CHANGED_QUESTION_PLAN");
    if (new Set(candidate.options.map((option) => option.id)).size !== 4) throw new Error("AI_MALFORMED_OPTIONS");
    question.options.forEach((option) => {
      const presented = candidate.options.find((item) => item.id === option.id);
      if (!presented || presented.valueToken !== canonicalize(option.content)) throw new Error("AI_CHANGED_GROUND_TRUTH");
    });
    question.questionText = candidate.prompt;
    question.explanation = candidate.explanation;
  });
  next.metadata.promptVersion = provenance.promptVersion ?? HYBRID_PRESENTATION_PROMPT_VERSION;
  next.metadata.modelIdentifier = provenance.model;
  next.metadata.reviewStatus = "needs_review";
  next.metadata.childFingerprints = next.questions.map(fingerprintSubjectTestletQuestion);
  next.metadata.fingerprint = fingerprintSubjectTestlet(next);
  next.metadata.semanticFingerprint = semanticFingerprintSubjectTestlet(next);
  const validation = validateSubjectTestlet(next);
  if (!validation.valid) throw new Error(`AI_PRESENTATION_REVALIDATION_FAILED:${validation.issues.map((issue) => issue.code).join(",")}`);
  return next;
}

export function acceptCriticResult(testlet: SubjectTestlet, raw: unknown): { testlet: SubjectTestlet; critic: CriticResult } {
  const critic = criticResultSchema.parse(raw);
  const next = structuredClone(testlet);
  if (critic.reasonCodes.includes("technical_conflict") && next.questions.every((question) => question.verificationClass === "A")) {
    next.metadata.reviewStatus = "needs_review";
    return { testlet: next, critic: { ...critic, decision: "REQUIRES_HUMAN_REVIEW" } };
  }
  next.metadata.reviewStatus = critic.decision === "PASS" ? "validated" : critic.decision === "FAIL" ? "rejected" : "needs_review";
  return { testlet: next, critic };
}
