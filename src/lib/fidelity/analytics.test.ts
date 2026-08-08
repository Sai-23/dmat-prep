import { describe, expect, it } from "vitest";
import { summarizeFidelityReviews } from "./analytics";
import { fidelityReviewSchema } from "./schemas";
import type { FidelityAuditSample, FidelityReview } from "./types";

const sample: FidelityAuditSample = {
  sampleId: "sample-1", questionType: "latin_square", difficulty: "easy", seed: "seed",
  generatorVersion: "latin@1", validatorVersion: "validator@1", fingerprint: "fingerprint", generatedSnapshot: {},
};

describe("fidelity review aggregation", () => {
  it("calculates exact grouped review metrics", () => {
    const reviews: FidelityReview[] = [
      { sampleId: "sample-1", reviewerId: "00000000-0000-4000-8000-000000000001", scores: { correctness: 5, formatFidelity: 4, clarity: 5, difficultyAppropriateness: 4, ambiguity: 5, mentalWorkloadAppropriateness: 4, overallQuality: 4 }, difficultyAgreement: true, ambiguityFlag: false, taskSpecific: {}, comments: "clear" },
      { sampleId: "sample-1", reviewerId: "00000000-0000-4000-8000-000000000002", scores: { correctness: 5, formatFidelity: 2, clarity: 3, difficultyAppropriateness: 2, ambiguity: 3, mentalWorkloadAppropriateness: 3, overallQuality: 2 }, difficultyAgreement: false, ambiguityFlag: true, taskSpecific: {}, comments: "review" },
    ];
    expect(summarizeFidelityReviews([sample], reviews)).toEqual([{ questionType: "latin_square", difficulty: "easy", generatorVersion: "latin@1", reviewCount: 2, meanReviewerScore: 3, meanFormatFidelityScore: 3, difficultyAgreementRate: 0.5, ambiguityFlagCount: 1, comments: ["clear", "review"] }]);
  });

  it("enforces complete 1 through 5 scoring", () => {
    expect(fidelityReviewSchema.safeParse({ sampleId: "x", reviewerId: "00000000-0000-4000-8000-000000000001", scores: { correctness: 6 }, difficultyAgreement: true, ambiguityFlag: false, taskSpecific: {}, comments: "" }).success).toBe(false);
  });
});
