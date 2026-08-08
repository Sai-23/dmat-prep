import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fidelityReviewSchema } from "./schemas";
import type { FidelityAuditSample } from "./types";

export async function storeFidelityAuditSamples(samples: readonly FidelityAuditSample[]): Promise<number> {
  if (!samples.length) return 0;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("fidelity_audit_samples").insert(
    samples.map((sample) => ({
      sample_key: sample.sampleId,
      question_type: sample.questionType,
      difficulty: sample.difficulty,
      seed: sample.seed,
      generator_version: sample.generatorVersion,
      validator_version: sample.validatorVersion,
      fingerprint: sample.fingerprint,
      generated_snapshot: sample.generatedSnapshot,
    })),
  );
  if (error) {
    if (error.code === "23505") throw new Error("One or more fidelity samples already exist and immutable samples were not replaced.");
    throw new Error("Unable to store the fidelity audit samples.");
  }
  return samples.length;
}

export async function saveFidelityReview(reviewerId: string, input: unknown): Promise<string> {
  const parsed = fidelityReviewSchema.safeParse({ ...(typeof input === "object" && input ? input : {}), reviewerId });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid fidelity review.");
  const admin = createSupabaseAdminClient();
  const { data: sample, error: sampleError } = await admin.from("fidelity_audit_samples").select("id").eq("sample_key", parsed.data.sampleId).single();
  if (sampleError || !sample) throw new Error("The fidelity sample does not exist.");
  const scores = parsed.data.scores;
  const { data, error } = await admin.from("fidelity_audit_reviews").upsert({
    sample_id: sample.id,
    reviewer_id: reviewerId,
    correctness_score: scores.correctness,
    format_fidelity_score: scores.formatFidelity,
    clarity_score: scores.clarity,
    difficulty_appropriateness_score: scores.difficultyAppropriateness,
    ambiguity_score: scores.ambiguity,
    mental_workload_score: scores.mentalWorkloadAppropriateness,
    overall_quality_score: scores.overallQuality,
    difficulty_agreement: parsed.data.difficultyAgreement,
    ambiguity_flag: parsed.data.ambiguityFlag,
    task_specific: parsed.data.taskSpecific,
    comments: parsed.data.comments,
  }, { onConflict: "sample_id,reviewer_id" }).select("id").single();
  if (error || !data) throw new Error("Unable to save the fidelity review.");
  return data.id as string;
}
