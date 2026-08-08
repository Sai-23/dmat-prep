import { describe, expect, it } from "vitest";
import { buildItemCalibration, calculateEmpiricalMetrics, groupEmpiricalMetrics, type AnalyticsResponse } from "./calibration";

function row(overrides: Partial<AnalyticsResponse> = {}): AnalyticsResponse {
  return { participantId: "participant", attemptId: "attempt", questionId: "question", questionType: "latin_square", questionFamily: "deduction", generatorVersion: "latin@1", validatorVersion: "validator@1", requestedDifficulty: "easy", calculatedDifficulty: "easy", outcome: "correct", responseTimeSeconds: 10, context: "practice", attemptedAt: "2026-01-01T00:00:00Z", reportCount: 0, ...overrides };
}

describe("Q7 empirical calibration", () => {
  it("calculates exact outcome, accuracy, mean, median, skip, and report metrics", () => {
    const metrics = calculateEmpiricalMetrics([
      row({ outcome: "correct", responseTimeSeconds: 10 }),
      row({ outcome: "correct", responseTimeSeconds: 20 }),
      row({ outcome: "incorrect", responseTimeSeconds: 30, reportCount: 1 }),
      row({ outcome: "unanswered", responseTimeSeconds: 40 }),
    ]);
    expect(metrics).toEqual({ attemptCount: 4, correctCount: 2, incorrectCount: 1, unansweredCount: 1, accuracy: 0.5, meanResponseTimeSeconds: 25, medianResponseTimeSeconds: 25, unansweredRate: 0.25, reportCount: 1, reportRate: 0.25 });
  });

  it("groups requested and calculated difficulty independently", () => {
    const rows = [row(), row({ requestedDifficulty: "hard", calculatedDifficulty: "medium", outcome: "incorrect" })];
    expect(groupEmpiricalMetrics(rows, "requestedDifficulty").map((group) => [group.label, group.attemptCount])).toEqual([["easy", 1], ["hard", 1]]);
    expect(groupEmpiricalMetrics(rows, "calculatedDifficulty").map((group) => [group.label, group.attemptCount])).toEqual([["easy", 1], ["medium", 1]]);
  });

  it("withholds conclusions below the configured sample threshold", () => {
    const item = buildItemCalibration(Array.from({ length: 3 }, () => row({ outcome: "incorrect", responseTimeSeconds: 500 })))[0];
    expect(item.sampleSufficient).toBe(false);
    expect(item.flags).toEqual([]);
  });

  it("creates review-only anomaly flags after sufficient evidence", () => {
    const item = buildItemCalibration(Array.from({ length: 20 }, (_, index) => row({ outcome: index < 2 ? "correct" : index < 13 ? "incorrect" : "unanswered", responseTimeSeconds: 240, reportCount: index < 4 ? 1 : 0 })))[0];
    expect(item.sampleSufficient).toBe(true);
    expect(item.flags).toEqual(["easy_low_accuracy", "high_response_time", "high_skip_rate", "high_report_rate"]);
  });
});
