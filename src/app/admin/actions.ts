"use server";

import { revalidatePath } from "next/cache";

import {
  createPublishedGeneratedEquation,
  createPublishedGeneratedLatin,
  createPublishedGeneratedFigure,
  createQuestion,
  getGeneratedEquationFingerprints,
  getGeneratedLatinFingerprints,
  getGeneratedFigureFingerprints,
  reviewQuestion,
  softDeleteQuestion,
  updateQuestionLifecycle,
  updateQuestion,
} from "@/lib/admin/data";
import {
  equationGenerationRequestSchema,
  figureGenerationRequestSchema,
  latinGenerationRequestSchema,
} from "@/lib/admin/generation-schemas";
import {
  generateValidatedMathematicalEquation,
  mathematicalEquationStructuralSignature,
  type MathematicalEquationQuestion,
} from "@/lib/generation/mathematical-equations";
import {
  generateValidatedLatinSquare,
  type LatinSquareQuestion,
} from "@/lib/generation/latin-squares";
import {
  generateValidatedFigureSequence,
  type FigureSequenceQuestion,
} from "@/lib/generation/figure-sequences";
import {
  saveAdminTest,
  updateAdminTestPublication,
} from "@/lib/admin/test-data";
import {
  questionAuthoringSchema,
  questionDeleteSchema,
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

export type EquationPreviewResponse =
  | {
      error: null;
      baseSeed: string;
      questions: MathematicalEquationQuestion[];
      questionIds: string[];
    }
  | { error: string; baseSeed?: undefined; questions?: undefined; questionIds?: undefined };

export async function generateEquationPreviewAction(
  input: unknown,
): Promise<EquationPreviewResponse> {
  const { user } = await requireRole(["admin"]);
  const parsed = equationGenerationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  }

  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const fingerprints = await getGeneratedEquationFingerprints();
    const structuralSignatures = new Set<string>();
    const questions: MathematicalEquationQuestion[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed =
        parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const question = generateValidatedMathematicalEquation(
        { seed, difficulty: parsed.data.difficulty },
        fingerprints,
        structuralSignatures,
      );
      fingerprints.add(question.metadata.fingerprint);
      structuralSignatures.add(mathematicalEquationStructuralSignature(question));
      questions.push(question);
    }
    const questionIds: string[] = [];
    for (const question of questions) {
      questionIds.push(await createPublishedGeneratedEquation(user.id, question));
    }
    revalidateGeneratedQuestionPaths();
    return { error: null, baseSeed, questions, questionIds };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate and publish validated equations.",
    };
  }
}

export type LatinPreviewResponse =
  | { error: null; baseSeed: string; questions: LatinSquareQuestion[]; questionIds: string[] }
  | { error: string; baseSeed?: undefined; questions?: undefined; questionIds?: undefined };

export async function generateLatinPreviewAction(
  input: unknown,
): Promise<LatinPreviewResponse> {
  const { user } = await requireRole(["admin"]);
  const parsed = latinGenerationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  }

  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const fingerprints = await getGeneratedLatinFingerprints();
    const questions: LatinSquareQuestion[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed = parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const question = generateValidatedLatinSquare(
        { seed, difficulty: parsed.data.difficulty },
        fingerprints,
      );
      fingerprints.add(question.metadata.fingerprint);
      questions.push(question);
    }
    const questionIds: string[] = [];
    for (const question of questions) {
      questionIds.push(await createPublishedGeneratedLatin(user.id, question));
    }
    revalidateGeneratedQuestionPaths();
    return { error: null, baseSeed, questions, questionIds };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate and publish validated Latin squares.",
    };
  }
}

export type FigurePreviewResponse =
  | { error: null; baseSeed: string; questions: FigureSequenceQuestion[]; questionIds: string[] }
  | { error: string; baseSeed?: undefined; questions?: undefined; questionIds?: undefined };

export async function generateFigurePreviewAction(input: unknown): Promise<FigurePreviewResponse> {
  const { user } = await requireRole(["admin"]);
  const parsed = figureGenerationRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const fingerprints = await getGeneratedFigureFingerprints();
    const questions: FigureSequenceQuestion[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed = parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const question = generateValidatedFigureSequence({ seed, difficulty: parsed.data.difficulty }, fingerprints);
      fingerprints.add(question.metadata.fingerprint);
      questions.push(question);
    }
    const questionIds: string[] = [];
    for (const question of questions) {
      questionIds.push(await createPublishedGeneratedFigure(user.id, question));
    }
    revalidateGeneratedQuestionPaths();
    return { error: null, baseSeed, questions, questionIds };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate and publish validated figure sequences." };
  }
}

function revalidateGeneratedQuestionPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/generate");
  revalidatePath("/admin/review");
  revalidatePath("/practice");
  revalidatePath("/tests");
}

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
    revalidatePath("/practice");
    revalidatePath("/tests");
    return {
      status: "success",
      message:
        result.wasPublished
          ? `Published correction saved as version ${result.version}.`
          : result.status === "under_review"
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

export async function deleteQuestionAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = questionDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "The question identifier is invalid." };

  try {
    const result = await softDeleteQuestion(user.id, parsed.data.questionId);
    revalidateGeneratedQuestionPaths();
    return {
      error: null,
      status: result.status,
      message:
        result.status === "already_deleted"
          ? "Question was already removed from the active bank."
          : "Question removed from the active bank.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not delete this question. Try again.",
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
