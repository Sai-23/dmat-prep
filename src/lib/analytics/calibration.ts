export type ResponseOutcome = "correct" | "incorrect" | "unanswered";
export type AttemptContext = "practice" | "mock";

export type AnalyticsResponse = {
  participantId: string;
  attemptId: string;
  questionId: string;
  questionType: string;
  questionFamily: string | null;
  generatorVersion: string | null;
  validatorVersion: string | null;
  requestedDifficulty: string | null;
  calculatedDifficulty: string | null;
  outcome: ResponseOutcome;
  responseTimeSeconds: number;
  context: AttemptContext;
  attemptedAt: string;
  reportCount: number;
};

export type CalibrationThresholds = {
  minimumEmpiricalSamples: number;
  easyLowAccuracy: number;
  hardHighAccuracy: number;
  highMedianResponseSeconds: number;
  highSkipRate: number;
  highReportRate: number;
};

export const DEFAULT_CALIBRATION_THRESHOLDS: CalibrationThresholds = {
  minimumEmpiricalSamples: 20,
  easyLowAccuracy: 0.45,
  hardHighAccuracy: 0.85,
  highMedianResponseSeconds: 180,
  highSkipRate: 0.3,
  highReportRate: 0.1,
};

export type EmpiricalMetrics = {
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  meanResponseTimeSeconds: number;
  medianResponseTimeSeconds: number;
  unansweredRate: number;
  reportCount: number;
  reportRate: number;
};

export type CalibrationFlag = "easy_low_accuracy" | "hard_high_accuracy" | "high_response_time" | "high_skip_rate" | "high_report_rate";

function rounded(value: number): number { return Math.round(value * 1000) / 1000; }

export function calculateEmpiricalMetrics(rows: readonly AnalyticsResponse[]): EmpiricalMetrics {
  const correctCount = rows.filter((row) => row.outcome === "correct").length;
  const incorrectCount = rows.filter((row) => row.outcome === "incorrect").length;
  const unansweredCount = rows.filter((row) => row.outcome === "unanswered").length;
  const times = rows.map((row) => row.responseTimeSeconds).sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  const median = !times.length ? 0 : times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
  const reportCount = rows.reduce((sum, row) => sum + row.reportCount, 0);
  return {
    attemptCount: rows.length,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy: rounded(correctCount / Math.max(1, rows.length)),
    meanResponseTimeSeconds: rounded(times.reduce((sum, value) => sum + value, 0) / Math.max(1, times.length)),
    medianResponseTimeSeconds: rounded(median),
    unansweredRate: rounded(unansweredCount / Math.max(1, rows.length)),
    reportCount,
    reportRate: rounded(reportCount / Math.max(1, rows.length)),
  };
}

export function calibrationFlags(
  metrics: EmpiricalMetrics,
  calculatedDifficulty: string | null,
  thresholds: CalibrationThresholds = DEFAULT_CALIBRATION_THRESHOLDS,
): CalibrationFlag[] {
  if (metrics.attemptCount < thresholds.minimumEmpiricalSamples) return [];
  const flags: CalibrationFlag[] = [];
  if (calculatedDifficulty === "easy" && metrics.accuracy < thresholds.easyLowAccuracy) flags.push("easy_low_accuracy");
  if (calculatedDifficulty === "hard" && metrics.accuracy > thresholds.hardHighAccuracy) flags.push("hard_high_accuracy");
  if (metrics.medianResponseTimeSeconds > thresholds.highMedianResponseSeconds) flags.push("high_response_time");
  if (metrics.unansweredRate > thresholds.highSkipRate) flags.push("high_skip_rate");
  if (metrics.reportRate > thresholds.highReportRate) flags.push("high_report_rate");
  return flags;
}

export function groupEmpiricalMetrics(rows: readonly AnalyticsResponse[], dimension: keyof Pick<AnalyticsResponse, "requestedDifficulty" | "calculatedDifficulty" | "generatorVersion" | "questionType" | "questionFamily" | "context">) {
  const groups = new Map<string, AnalyticsResponse[]>();
  rows.forEach((row) => {
    const label = String(row[dimension] ?? "unknown");
    groups.set(label, [...(groups.get(label) ?? []), row]);
  });
  return [...groups.entries()].map(([label, values]) => ({ label, ...calculateEmpiricalMetrics(values) })).sort((a, b) => a.label.localeCompare(b.label));
}

export function buildItemCalibration(rows: readonly AnalyticsResponse[], thresholds = DEFAULT_CALIBRATION_THRESHOLDS) {
  const groups = new Map<string, AnalyticsResponse[]>();
  rows.forEach((row) => groups.set(row.questionId, [...(groups.get(row.questionId) ?? []), row]));
  return [...groups.entries()].map(([questionId, values]) => {
    const metrics = calculateEmpiricalMetrics(values);
    const sample = values[0];
    return {
      questionId,
      questionType: sample.questionType,
      questionFamily: sample.questionFamily,
      generatorVersion: sample.generatorVersion,
      requestedDifficulty: sample.requestedDifficulty,
      calculatedDifficulty: sample.calculatedDifficulty,
      metrics,
      sampleSufficient: metrics.attemptCount >= thresholds.minimumEmpiricalSamples,
      flags: calibrationFlags(metrics, sample.calculatedDifficulty, thresholds),
    };
  }).sort((a, b) => b.metrics.attemptCount - a.metrics.attemptCount);
}
