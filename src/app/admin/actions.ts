"use server";

import { revalidatePath } from "next/cache";

import {
  createQuestion,
  reviewQuestion,
  updateQuestionLifecycle,
  updateQuestion,
} from "@/lib/admin/data";
import {
  saveAdminTest,
  updateAdminTestPublication,
} from "@/lib/admin/test-data";
import {
  questionAuthoringSchema,
  questionEditIdSchema,
  questionLifecycleSchema,
  questionReviewSchema,
} from "@/lib/admin/schemas";
import {
  adminTestBuilderSchema,
  adminTestIdSchema,
  adminTestLifecycleSchema,
} from "@/lib/admin/test-schemas";
import { requireRole } from "@/lib/auth/guards";

export type QuestionFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  questionId?: string;
  errors?: Record<string, string[] | undefined>;
};

export type AdminTestFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  testId?: string;
  errors?: Record<string, string[] | undefined>;
};

export async function createQuestionAction(
  _state: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const { user } = await requireRole(["admin"]);
  const parsed = questionAuthoringSchema.safeParse({
    module: formData.get("module"),
    questionType: formData.get("questionType"),
    subject: formData.get("subject"),
    topic: formData.get("topic"),
    subtopic: formData.get("subtopic"),
    difficulty: formData.get("difficulty"),
    questionText: formData.get("questionText"),
    passage: formData.get("passage"),
    code: formData.get("code"),
    formula: formData.get("formula"),
    structuredData: formData.get("structuredData"),
    imageUrl: formData.get("imageUrl"),
    explanation: formData.get("explanation"),
    estimatedTimeSeconds: formData.get("estimatedTimeSeconds"),
    sourceType: formData.get("sourceType"),
    options: [0, 1, 2, 3].map((index) => formData.get(`option${index}`)),
    correctOptionIndex: formData.get("correctOptionIndex"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const questionId = formData.get("questionId");
    const parsedQuestionId =
      typeof questionId === "string" && questionId
        ? questionEditIdSchema.safeParse(questionId)
        : null;
    if (parsedQuestionId && !parsedQuestionId.success) {
      return { status: "error", message: "The question identifier is invalid." };
    }
    const result =
      parsedQuestionId?.success
        ? await updateQuestion(user.id, parsedQuestionId.data, parsed.data)
        : await createQuestion(user.id, parsed.data);
    revalidatePath("/admin");
    revalidatePath("/admin/review");
    return {
      status: "success",
      message:
        result.status === "under_review"
          ? parsedQuestionId
            ? "Question updated and submitted for review."
            : "Question created and submitted for review."
          : parsedQuestionId
            ? "Question draft updated."
            : "Question draft created.",
      questionId: result.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unable to create this question.",
    };
  }
}

export async function reviewQuestionAction(input: unknown) {
  const { user } = await requireRole(["reviewer", "admin"]);
  const parsed = questionReviewSchema.safeParse(input);
  if (!parsed.success) return { error: "The review decision is invalid." };

  try {
    await reviewQuestion(user.id, parsed.data);
    revalidatePath("/admin");
    revalidatePath("/admin/review");
    return { error: null, success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to save this review.",
    };
  }
}

export async function questionLifecycleAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = questionLifecycleSchema.safeParse(input);
  if (!parsed.success) return { error: "The lifecycle request is invalid." };

  try {
    await updateQuestionLifecycle(
      user.id,
      parsed.data.questionId,
      parsed.data.action,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/review");
    revalidatePath("/practice");
    return { error: null, success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to update the question lifecycle.",
    };
  }
}

export async function saveAdminTestAction(
  _state: AdminTestFormState,
  formData: FormData,
): Promise<AdminTestFormState> {
  const { user } = await requireRole(["admin"]);
  let sections: unknown;
  try {
    sections = JSON.parse(String(formData.get("sections") ?? "[]"));
  } catch {
    return {
      status: "error",
      message: "The test section structure is invalid.",
    };
  }

  const parsed = adminTestBuilderSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    testType: formData.get("testType"),
    module: formData.get("module"),
    instructions: formData.get("instructions"),
    isPremium: formData.get("isPremium") === "on",
    randomizeQuestions: formData.get("randomizeQuestions") === "on",
    randomizeOptions: formData.get("randomizeOptions") === "on",
    intent: formData.get("intent"),
    sections,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Check the test details and sections.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const rawTestId = formData.get("testId");
  const parsedTestId =
    typeof rawTestId === "string" && rawTestId
      ? adminTestIdSchema.safeParse(rawTestId)
      : null;
  if (parsedTestId && !parsedTestId.success) {
    return { status: "error", message: "The test identifier is invalid." };
  }

  try {
    const result = await saveAdminTest(
      user.id,
      parsed.data,
      parsedTestId?.success ? parsedTestId.data : undefined,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/tests");
    revalidatePath("/tests");
    return {
      status: "success",
      message: result.isPublished
        ? "Test saved and published."
        : parsedTestId
          ? "Test draft updated."
          : "Test draft created.",
      testId: result.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unable to save this test.",
    };
  }
}

export async function adminTestLifecycleAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = adminTestLifecycleSchema.safeParse(input);
  if (!parsed.success) return { error: "The test lifecycle request is invalid." };

  try {
    await updateAdminTestPublication(
      user.id,
      parsed.data.testId,
      parsed.data.action,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/tests");
    revalidatePath("/tests");
    return { error: null, success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to update the test lifecycle.",
    };
  }
}
