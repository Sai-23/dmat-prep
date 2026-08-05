import { z } from "zod";

import type { PracticeQuestion } from "@/lib/practice/schemas";

export const bookmarkMutationSchema = z.object({
  questionId: z.string().uuid(),
  bookmarked: z.boolean(),
});

export const mistakeEntrySchema = z.object({
  questionId: z.string().uuid(),
  note: z.string().trim().max(2000, "Notes must be 2,000 characters or fewer."),
  isUnderstood: z.boolean(),
});

export type BookmarkQuestion = {
  id: string;
  module: PracticeQuestion["module"];
  questionType: PracticeQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: PracticeQuestion["difficulty"];
  questionText: string;
  bookmarkedAt: string;
};

export type MistakeQuestion = {
  id: string;
  module: PracticeQuestion["module"];
  questionType: PracticeQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: PracticeQuestion["difficulty"];
  questionText: string;
  options: PracticeQuestion["options"];
  selectedOptionId: string | null;
  correctOptionId: string;
  explanation: string;
  occurrenceCount: number;
  lastIncorrectAt: string | null;
  note: string;
  isUnderstood: boolean;
  isBookmarked: boolean;
};
