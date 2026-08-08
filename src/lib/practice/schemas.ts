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
  answer: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("single_choice"), optionId: z.string().min(1).max(200) }),
    z.object({ kind: z.literal("symbol_assignment"), values: z.record(z.string().regex(/^[A-Z]$/), z.number().int().min(1).max(20)) }),
    z.object({ kind: z.literal("two_stage_single_choice"), optionIds: z.tuple([z.string().min(1), z.string().min(1)]) }),
    z.object({ kind: z.literal("subject_answers"), answers: z.record(z.string().min(1), z.string().min(1)) }),
  ]),
});

export const completePracticeSchema = z.object({
  attemptId: z.string().uuid(),
});

export const practiceReportSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  reason: z.enum(["incorrect_answer", "ambiguous_wording", "unclear_explanation", "formatting_problem", "technical_issue"]),
  details: z.string().trim().max(2000).optional().transform((value) => value || null),
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
  structuredData?: unknown;
  response?: PracticeResponse;
  options: Array<{
    id: string;
    label: string;
    content: string;
  }>;
};

export type PracticeResponse =
  | { kind: "single_choice"; options: Array<{ id: string; label: string; content: string }> }
  | { kind: "symbol_assignment"; symbols: string[] }
  | { kind: "two_stage_single_choice" }
  | { kind: "subject_answers" };

export type PracticeAnswer = z.infer<typeof answerSubmissionSchema>["answer"];

export type PracticeFilters = {
  topicsByModule: Record<(typeof MODULES)[number], string[]>;
};
