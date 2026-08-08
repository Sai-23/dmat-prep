import { z } from "zod";

const score = z.number().int().min(1).max(5);

export const fidelityReviewSchema = z.object({
  sampleId: z.string().trim().min(1).max(200),
  reviewerId: z.string().uuid(),
  scores: z.object({
    correctness: score,
    formatFidelity: score,
    clarity: score,
    difficultyAppropriateness: score,
    ambiguity: score,
    mentalWorkloadAppropriateness: score,
    overallQuality: score,
  }),
  difficultyAgreement: z.boolean(),
  ambiguityFlag: z.boolean(),
  taskSpecific: z.record(z.string(), z.union([z.boolean(), z.number().finite(), z.string().max(500)])),
  comments: z.string().trim().max(4000),
});
