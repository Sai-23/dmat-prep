import { z } from "zod";

import type { PracticeQuestion } from "@/lib/practice/schemas";

export const testIdSchema = z.string().uuid();

export const saveTestResponseSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().nullable(),
  markedForReview: z.boolean(),
  timeSpentSeconds: z.number().int().min(0).max(86_400),
});

export const submitTestSchema = z.object({
  attemptId: z.string().uuid(),
  autoSubmitted: z.boolean().default(false),
});

export type TestCatalogItem = {
  id: string;
  title: string;
  description: string | null;
  testType: "diagnostic" | "mini_mock" | "full_mock" | "sectional";
  module: "core" | "computer_science" | null;
  durationSeconds: number;
  isPremium: boolean;
  sectionCount: number;
  questionCount: number;
  hasAccess: boolean;
};

export type TestOverview = TestCatalogItem & {
  instructions: string | null;
  sections: Array<{
    id: string;
    title: string;
    durationSeconds: number;
    questionCount: number;
  }>;
};

export type TestQuestion = PracticeQuestion & {
  sectionTitle: string;
};

export type TestAttemptPayload = {
  attemptId: string;
  title: string;
  durationSeconds: number;
  expiresAt: string;
  questions: TestQuestion[];
  initialResponses: Array<{
    questionId: string;
    selectedOptionId: string | null;
    markedForReview: boolean;
    timeSpentSeconds: number;
  }>;
};
