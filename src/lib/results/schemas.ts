import { z } from "zod";

import type { PracticeAnswer, PracticeQuestion } from "@/lib/practice/schemas";

export const resultAttemptIdSchema = z.string().uuid();

export type ResultHistoryItem = {
  id: string;
  testTitle: string;
  status: "submitted" | "auto_submitted";
  startedAt: string;
  submittedAt: string | null;
  score: number;
  accuracy: number;
  totalTimeSeconds: number;
};

export type ResultBreakdown = {
  label: string;
  correct: number;
  total: number;
  accuracy: number;
  averageTimeSeconds: number;
};

export type ResultQuestion = Omit<
  PracticeQuestion,
  "estimatedTimeSeconds" | "imageUrl" | "tableData"
> & {
  sectionTitle: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  explanation: string;
  responseStatus: "unanswered" | "answered" | "skipped";
  isCorrect: boolean;
  markedForReview: boolean;
  isBookmarked: boolean;
  timeSpentSeconds: number;
  answer?: PracticeAnswer | null;
  correctAnswer?: unknown;
};

export type AttemptResult = {
  id: string;
  testTitle: string;
  status: "submitted" | "auto_submitted";
  startedAt: string;
  submittedAt: string | null;
  totalTimeSeconds: number;
  score: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  answeredCount: number;
  topicBreakdown: ResultBreakdown[];
  difficultyBreakdown: ResultBreakdown[];
  questions: ResultQuestion[];
  recommendation: {
    title: string;
    description: string;
  };
};
