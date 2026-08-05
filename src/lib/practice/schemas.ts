import { z } from "zod";

import {
  DIFFICULTIES,
  MODULES,
  QUESTION_TYPES,
  SOURCE_TYPES,
} from "../../types/questions";

export const practiceConfigSchema = z.object({
  questionId: z.string().uuid().optional(),
  module: z.enum(MODULES),
  questionType: z.union([z.literal("any"), z.enum(QUESTION_TYPES)]),
  topic: z.string().trim().max(120).optional(),
  difficulty: z.union([z.literal("any"), z.enum(DIFFICULTIES)]),
  sourceType: z.union([z.literal("any"), z.enum(SOURCE_TYPES)]),
  quantity: z.number().int().min(1).max(20),
  timingMode: z.enum(["untimed", "timed"]),
});

export const answerSubmissionSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
  timeSpentSeconds: z.number().int().min(0).max(86_400),
});

export const completePracticeSchema = z.object({
  attemptId: z.string().uuid(),
});

export type PracticeConfig = z.infer<typeof practiceConfigSchema>;

export type PracticeQuestion = {
  id: string;
  module: (typeof MODULES)[number];
  questionType: (typeof QUESTION_TYPES)[number];
  topic: string;
  subtopic: string | null;
  difficulty: (typeof DIFFICULTIES)[number];
  questionText: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  tableData: unknown;
  imageUrl: string | null;
  estimatedTimeSeconds: number;
  options: Array<{
    id: string;
    label: string;
    content: string;
  }>;
};

export type PracticeFilters = {
  topicsByModule: Record<(typeof MODULES)[number], string[]>;
};
