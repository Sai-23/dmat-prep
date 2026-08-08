"use server";

import { requireUser } from "@/lib/auth/guards";
import {
  createPracticeAttempt,
  finishPracticeAttempt,
  markPracticeQuestionShown,
  reportPracticeQuestion,
  recordPracticeAnswer,
} from "@/lib/practice/data";
import {
  answerSubmissionSchema,
  completePracticeSchema,
  practiceReportSchema,
  practiceConfigSchema,
} from "@/lib/practice/schemas";

export async function startPracticeAction(input: unknown) {
  const user = await requireUser();
  const parsed = practiceConfigSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Check the practice settings and try again.",
    };
  }

  try {
    return await createPracticeAttempt(user.id, parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to start practice right now.",
    };
  }
}

export async function showPracticeQuestionAction(input: unknown) {
  const user = await requireUser();
  const parsed = answerSubmissionSchema.pick({ attemptId: true, questionId: true }).safeParse(input);
  if (!parsed.success) return { error: "The practice question is invalid." };
  try {
    await markPracticeQuestionShown(user.id, parsed.data.attemptId, parsed.data.questionId);
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to restore response timing." };
  }
}

export async function reportPracticeQuestionAction(input: unknown) {
  const user = await requireUser();
  const parsed = practiceReportSchema.safeParse(input);
  if (!parsed.success) return { error: "The question report is invalid." };
  try {
    await reportPracticeQuestion(user.id, parsed.data);
    return { error: null, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to report this question." };
  }
}

export async function submitPracticeAnswerAction(input: unknown) {
  const user = await requireUser();
  const parsed = answerSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "The answer submission was invalid." };
  }

  try {
    const result = await recordPracticeAnswer(user.id, parsed.data);
    return { error: null, ...result };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to save this answer.",
    };
  }
}

export async function completePracticeAction(input: unknown) {
  const user = await requireUser();
  const parsed = completePracticeSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "The practice attempt was invalid." };
  }

  try {
    const result = await finishPracticeAttempt(user.id, parsed.data.attemptId);
    return { error: null, ...result };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to complete this practice attempt.",
    };
  }
}
