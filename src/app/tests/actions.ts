"use server";

import { requireUser } from "@/lib/auth/guards";
import {
  gradeAndSubmitTest,
  saveTestResponse,
  startTestAttempt,
} from "@/lib/tests/data";
import {
  saveTestResponseSchema,
  submitTestSchema,
  testIdSchema,
} from "@/lib/tests/schemas";

export async function startTestAction(testId: unknown) {
  const user = await requireUser();
  const parsed = testIdSchema.safeParse(testId);
  if (!parsed.success) return { error: "The selected test is invalid." };

  try {
    const result = await startTestAttempt(user.id, parsed.data);
    return { error: null, ...result };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to start this test.",
    };
  }
}

export async function saveTestResponseAction(input: unknown) {
  const user = await requireUser();
  const parsed = saveTestResponseSchema.safeParse(input);
  if (!parsed.success) return { error: "The response data is invalid." };

  try {
    await saveTestResponse(user.id, parsed.data);
    return { error: null, saved: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to save this response.",
    };
  }
}

export async function submitTestAction(input: unknown) {
  const user = await requireUser();
  const parsed = submitTestSchema.safeParse(input);
  if (!parsed.success) return { error: "The test submission is invalid." };

  try {
    const result = await gradeAndSubmitTest(
      user.id,
      parsed.data.attemptId,
      parsed.data.autoSubmitted,
    );
    return { error: null, ...result };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to submit this test.",
    };
  }
}
