import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildItemCalibration, groupEmpiricalMetrics, type AnalyticsResponse, type AttemptContext, type ResponseOutcome } from "./calibration";

type AnalyticsRow = {
  participant_id: string;
  attempt_id: string;
  question_id: string;
  question_type: string;
  question_family: string | null;
  generator_version: string | null;
  validator_version: string | null;
  requested_difficulty: string | null;
  calculated_difficulty: string | null;
  outcome: string;
  response_time_seconds: number;
  attempt_context: string;
  attempted_at: string;
  report_count: number;
};

function normalize(row: AnalyticsRow): AnalyticsResponse {
  return {
    participantId: row.participant_id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    questionType: row.question_type,
    questionFamily: row.question_family,
    generatorVersion: row.generator_version,
    validatorVersion: row.validator_version,
    requestedDifficulty: row.requested_difficulty,
    calculatedDifficulty: row.calculated_difficulty,
    outcome: row.outcome as ResponseOutcome,
    responseTimeSeconds: Number(row.response_time_seconds),
    context: row.attempt_context as AttemptContext,
    attemptedAt: row.attempted_at,
    reportCount: Number(row.report_count),
  };
}

export async function getAnalyticsResponses(): Promise<AnalyticsResponse[]> {
  const admin = createSupabaseAdminClient();
  const rows: AnalyticsRow[] = [];
  const pageSize = 1_000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from("admin_response_analytics").select("*").order("attempted_at", { ascending: false }).range(from, from + pageSize - 1);
    if (error) throw new Error("Unable to load empirical response analytics. Apply the Q7 database migration first.");
    rows.push(...((data ?? []) as AnalyticsRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows.map(normalize);
}

export async function getCalibrationDashboard() {
  const responses = await getAnalyticsResponses();
  return {
    responseCount: responses.length,
    itemCalibration: buildItemCalibration(responses),
    byRequestedDifficulty: groupEmpiricalMetrics(responses, "requestedDifficulty"),
    byCalculatedDifficulty: groupEmpiricalMetrics(responses, "calculatedDifficulty"),
    byQuestionType: groupEmpiricalMetrics(responses, "questionType"),
    byQuestionFamily: groupEmpiricalMetrics(responses, "questionFamily"),
    byGeneratorVersion: groupEmpiricalMetrics(responses, "generatorVersion"),
    byContext: groupEmpiricalMetrics(responses, "context"),
  };
}
