import type { FidelityAuditSample, FidelityReview, FidelitySummaryRow } from "./types";

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 1000) / 1000;
}

export function summarizeFidelityReviews(
  samples: readonly FidelityAuditSample[],
  reviews: readonly FidelityReview[],
): FidelitySummaryRow[] {
  const reviewBySample = new Map<string, FidelityReview[]>();
  reviews.forEach((review) => reviewBySample.set(review.sampleId, [...(reviewBySample.get(review.sampleId) ?? []), review]));
  const groups = new Map<string, { sample: FidelityAuditSample; reviews: FidelityReview[] }>();
  samples.forEach((sample) => {
    const key = `${sample.questionType}\u001f${sample.difficulty}\u001f${sample.generatorVersion}`;
    const group = groups.get(key) ?? { sample, reviews: [] };
    group.reviews.push(...(reviewBySample.get(sample.sampleId) ?? []));
    groups.set(key, group);
  });
  return [...groups.values()].map(({ sample, reviews: groupReviews }) => ({
    questionType: sample.questionType,
    difficulty: sample.difficulty,
    generatorVersion: sample.generatorVersion,
    reviewCount: groupReviews.length,
    meanReviewerScore: mean(groupReviews.map((review) => review.scores.overallQuality)),
    meanFormatFidelityScore: mean(groupReviews.map((review) => review.scores.formatFidelity)),
    difficultyAgreementRate: mean(groupReviews.map((review) => Number(review.difficultyAgreement))),
    ambiguityFlagCount: groupReviews.filter((review) => review.ambiguityFlag).length,
    comments: groupReviews.map((review) => review.comments).filter(Boolean),
  }));
}
