"use server";

import { revalidatePath } from "next/cache";

import {
  createGeneratedEquationDraft,
  createGeneratedLatinDraft,
  createGeneratedFigureDraft,
  createGeneratedComputerScienceDraft,
  createQuestion,
  getGeneratedEquationFingerprints,
  getGeneratedLatinFingerprints,
  getGeneratedFigureFingerprints,
  getGeneratedComputerScienceFingerprints,
  reviewQuestion,
  updateQuestionLifecycle,
  updateQuestion,
} from "@/lib/admin/data";
import {
  equationGenerationRequestSchema,
  generatedEquationSaveSchema,
  generatedLatinSaveSchema,
  generatedFigureSaveSchema,
  figureGenerationRequestSchema,
  computerScienceGenerationRequestSchema,
  generatedComputerScienceSaveSchema,
  latinGenerationRequestSchema,
} from "@/lib/admin/generation-schemas";
import {
  generateValidatedMathematicalEquation,
  reproduceValidatedMathematicalEquation,
  type MathematicalEquationQuestion,
} from "@/lib/generation/mathematical-equations";
import {
  generateValidatedLatinSquare,
  reproduceValidatedLatinSquare,
  type LatinSquareQuestion,
} from "@/lib/generation/latin-squares";
import {
  generateValidatedFigureSequence,
  reproduceValidatedFigureSequence,
  type FigureSequenceQuestion,
} from "@/lib/generation/figure-sequences";
import {
  generateValidatedBooleanSubjectTestlet,
  generateValidatedCircuitSubjectTestlet,
  generateValidatedProgrammingSubjectTestlet,
  generateValidatedRecursionSubjectTestlet,
  generateValidatedOopSubjectTestlet,
  reproduceValidatedBooleanSubjectTestlet,
  reproduceValidatedCircuitSubjectTestlet,
  reproduceValidatedProgrammingSubjectTestlet,
  reproduceValidatedRecursionSubjectTestlet,
  reproduceValidatedOopSubjectTestlet,
  adaptSubjectTestletForDelivery,
  applyAiPresentation,
  acceptCriticResult,
  validateSubjectTestlet,
  type SubjectTestlet,
  type GeneratedComputerScienceUnit,
  type LogicTestletSize,
} from "@/lib/generation/computer-science";
import { generateOpenAiPresentation, reviewWithOpenAiCritic } from "@/lib/generation/computer-science/testlets/openai-hybrid.server";
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

export type EquationPreviewResponse =
  | {
      error: null;
      baseSeed: string;
      questions: MathematicalEquationQuestion[];
    }
  | { error: string; baseSeed?: undefined; questions?: undefined };

export async function generateEquationPreviewAction(
  input: unknown,
): Promise<EquationPreviewResponse> {
  await requireRole(["admin"]);
  const parsed = equationGenerationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  }

  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const fingerprints = await getGeneratedEquationFingerprints();
    const questions: MathematicalEquationQuestion[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed =
        parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const question = generateValidatedMathematicalEquation(
        { seed, difficulty: parsed.data.difficulty },
        fingerprints,
      );
      fingerprints.add(question.metadata.fingerprint);
      questions.push(question);
    }
    return { error: null, baseSeed, questions };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate a validated preview.",
    };
  }
}

export async function saveGeneratedEquationAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = generatedEquationSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The generated-question provenance is invalid." };

  try {
    const question = reproduceValidatedMathematicalEquation(
      { seed: parsed.data.seed, difficulty: parsed.data.difficulty },
      parsed.data.attemptCount,
    );
    if (question.metadata.fingerprint !== parsed.data.fingerprint) {
      return { error: "The preview could not be reproduced exactly and was not saved." };
    }
    const questionId = await createGeneratedEquationDraft(user.id, question);
    revalidatePath("/admin");
    revalidatePath("/admin/generate");
    revalidatePath("/admin/review");
    return { error: null, questionId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save the generated equation draft.",
    };
  }
}

export type LatinPreviewResponse =
  | { error: null; baseSeed: string; questions: LatinSquareQuestion[] }
  | { error: string; baseSeed?: undefined; questions?: undefined };

export async function generateLatinPreviewAction(
  input: unknown,
): Promise<LatinPreviewResponse> {
  await requireRole(["admin"]);
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
    return { error: null, baseSeed, questions };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate a validated Latin-square preview.",
    };
  }
}

export async function saveGeneratedLatinAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = generatedLatinSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The Latin-square provenance is invalid." };

  try {
    const question = reproduceValidatedLatinSquare(
      { seed: parsed.data.seed, difficulty: parsed.data.difficulty },
      parsed.data.attemptCount,
    );
    if (question.metadata.fingerprint !== parsed.data.fingerprint) {
      return { error: "The Latin-square preview could not be reproduced exactly and was not saved." };
    }
    const questionId = await createGeneratedLatinDraft(user.id, question);
    revalidatePath("/admin");
    revalidatePath("/admin/generate");
    revalidatePath("/admin/review");
    return { error: null, questionId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save the generated Latin-square draft.",
    };
  }
}

export type FigurePreviewResponse =
  | { error: null; baseSeed: string; questions: FigureSequenceQuestion[] }
  | { error: string; baseSeed?: undefined; questions?: undefined };

export async function generateFigurePreviewAction(input: unknown): Promise<FigurePreviewResponse> {
  await requireRole(["admin"]);
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
    return { error: null, baseSeed, questions };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate a validated figure-sequence preview." };
  }
}

export async function saveGeneratedFigureAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = generatedFigureSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The figure-sequence provenance is invalid." };
  try {
    const question = reproduceValidatedFigureSequence(
      { seed: parsed.data.seed, difficulty: parsed.data.difficulty },
      parsed.data.attemptCount,
    );
    if (question.metadata.fingerprint !== parsed.data.fingerprint) {
      return { error: "The figure-sequence preview could not be reproduced exactly and was not saved." };
    }
    const questionId = await createGeneratedFigureDraft(user.id, question);
    revalidatePath("/admin");
    revalidatePath("/admin/generate");
    revalidatePath("/admin/review");
    return { error: null, questionId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save the generated figure-sequence draft." };
  }
}

export type ComputerSciencePreviewResponse =
  | { error: null; baseSeed: string; questions: GeneratedComputerScienceUnit[] }
  | { error: string; baseSeed?: undefined; questions?: undefined };

export async function generateComputerSciencePreviewAction(input: unknown): Promise<ComputerSciencePreviewResponse> {
  await requireRole(["admin"]);
  const parsed = computerScienceGenerationRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const fingerprints = await getGeneratedComputerScienceFingerprints();
    const questions: GeneratedComputerScienceUnit[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed = parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const configuration = { seed, difficulty: parsed.data.difficulty, targetSize: parsed.data.targetSize as LogicTestletSize };
      let unit = parsed.data.family === "programming_trace"
        ? generateValidatedProgrammingSubjectTestlet(configuration, fingerprints)
        : parsed.data.family === "programming_recursion"
          ? generateValidatedRecursionSubjectTestlet(configuration, fingerprints)
          : parsed.data.family === "programming_oop"
            ? generateValidatedOopSubjectTestlet(configuration, fingerprints)
        : parsed.data.family === "combinational_circuits"
          ? generateValidatedCircuitSubjectTestlet(configuration, fingerprints)
          : generateValidatedBooleanSubjectTestlet(configuration, fingerprints);
      if (parsed.data.generationMode === "hybrid_dynamic") {
        if (!("testlet" in unit) || !["programming_testlet", "recursion_testlet", "oop_testlet"].includes(unit.family)) throw new Error("Hybrid presentation is currently available for Programming testlets only.");
        const presentation = await generateOpenAiPresentation(unit.testlet);
        const presented = applyAiPresentation(unit.testlet, presentation.value, { model: presentation.model });
        const criticResponse = await reviewWithOpenAiCritic(presented);
        const reviewed = acceptCriticResult(presented, criticResponse.value);
        if (reviewed.critic.decision !== "PASS") throw new Error(`AI critic ${reviewed.critic.decision.toLowerCase().replaceAll("_", " ")}: ${reviewed.critic.reasonCodes.join(", ") || reviewed.critic.summary}`);
        unit = adaptSubjectTestletForDelivery(reviewed.testlet, configuration, unit.family);
      }
      fingerprints.add(unit.metadata.fingerprint);
      questions.push(unit);
    }
    return { error: null, baseSeed, questions };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate a validated subject unit." };
  }
}

export async function saveGeneratedComputerScienceAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = generatedComputerScienceSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The subject-unit provenance is invalid." };
  try {
    const configuration = { seed: parsed.data.seed, difficulty: parsed.data.difficulty, targetSize: parsed.data.targetSize as LogicTestletSize };
    let unit = parsed.data.family === "programming_trace"
      ? reproduceValidatedProgrammingSubjectTestlet(configuration, parsed.data.attemptCount)
      : parsed.data.family === "programming_recursion"
        ? reproduceValidatedRecursionSubjectTestlet(configuration, parsed.data.attemptCount)
        : parsed.data.family === "programming_oop"
          ? reproduceValidatedOopSubjectTestlet(configuration, parsed.data.attemptCount)
      : parsed.data.family === "combinational_circuits"
        ? reproduceValidatedCircuitSubjectTestlet(configuration, parsed.data.attemptCount)
        : reproduceValidatedBooleanSubjectTestlet(configuration, parsed.data.attemptCount);
    if (parsed.data.generationMode === "hybrid_dynamic") {
      const snapshot = parsed.data.snapshot as SubjectTestlet;
      const validation = validateSubjectTestlet(snapshot);
      if (!validation.valid || snapshot.metadata.reviewStatus !== "validated" || snapshot.metadata.seed !== parsed.data.seed) return { error: "The accepted hybrid snapshot is invalid or has not passed critic review." };
      if (!("testlet" in unit) || !["programming_testlet", "recursion_testlet", "oop_testlet"].includes(unit.family)) return { error: "Hybrid snapshots are supported for Programming only." };
      unit = adaptSubjectTestletForDelivery(snapshot, configuration, unit.family);
    }
    if (unit.metadata.fingerprint !== parsed.data.fingerprint) {
      return { error: "The subject-unit preview could not be reproduced exactly and was not saved." };
    }
    const questionId = await createGeneratedComputerScienceDraft(user.id, unit);
    revalidatePath("/admin");
    revalidatePath("/admin/generate");
    revalidatePath("/admin/review");
    return { error: null, questionId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save the generated subject-unit draft." };
  }
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
