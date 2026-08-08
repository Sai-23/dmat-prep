import "server-only";

import type {
  AdminMetrics,
  EditableQuestion,
  QuestionAuthoringInput,
  ReviewQueueQuestion,
} from "@/lib/admin/schemas";
import { canAdminEditQuestion } from "@/lib/admin/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MathematicalEquationQuestion } from "@/lib/generation/mathematical-equations";
import type { LatinSquareQuestion } from "@/lib/generation/latin-squares";
import type { FigureSequenceQuestion } from "@/lib/generation/figure-sequences";
import type { GeneratedComputerScienceUnit } from "@/lib/generation/computer-science";
import { evaluatePublication } from "@/lib/admin/publishing-policy";

function questionSnapshot(
  question: Record<string, unknown>,
  options: Array<Record<string, unknown>>,
) {
  return { ...question, options };
}

async function writeAudit(
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: "question",
    entity_id: entityId,
    metadata,
  });
  if (error) throw new Error("The change was saved, but its audit record failed.");
}

async function getGeneratedFingerprints(
  questionType: "mathematical_equation" | "latin_square" | "figure_sequence" | "computer_science",
): Promise<Set<string>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("metadata")
    .eq("source_type", "generated")
    .eq("question_type", questionType);
  if (error) throw new Error("Unable to load existing generated fingerprints.");

  return new Set(
    (data ?? []).flatMap((row) => {
      const metadata = row.metadata as
        | { generation?: { fingerprint?: unknown } }
        | null;
      const fingerprint = metadata?.generation?.fingerprint;
      return typeof fingerprint === "string" ? [fingerprint] : [];
    }),
  );
}

export function getGeneratedEquationFingerprints(): Promise<Set<string>> {
  return getGeneratedFingerprints("mathematical_equation");
}

export function getGeneratedLatinFingerprints(): Promise<Set<string>> {
  return getGeneratedFingerprints("latin_square");
}

export function getGeneratedFigureFingerprints(): Promise<Set<string>> {
  return getGeneratedFingerprints("figure_sequence");
}

export function getGeneratedComputerScienceFingerprints(): Promise<Set<string>> {
  return getGeneratedFingerprints("computer_science");
}

export async function createGeneratedEquationDraft(
  actorId: string,
  question: MathematicalEquationQuestion,
): Promise<string> {
  if (
    !question.validation.valid ||
    !question.validation.checks.every((validationCheck) => validationCheck.passed)
  ) {
    throw new Error("Only fully validated generated questions can be saved.");
  }

  const admin = createSupabaseAdminClient();
  const structuredData = {
    schemaVersion: 1,
    task: question.structuredData,
    presentation: question.presentation,
    response: question.response,
    solutionPath: question.solutionPath,
  };
  const metadata = {
    generation: question.metadata,
    validation: question.validation,
    correctAnswer: question.correctAnswer,
  };
  const { data: saved, error: saveError } = await admin
    .from("questions")
    .insert({
      module: "core",
      question_type: "mathematical_equation",
      topic: question.topic,
      subtopic: question.subtopic ?? null,
      difficulty: question.metadata.calculatedDifficulty,
      question_text: question.presentation.prompt,
      structured_data: structuredData,
      metadata,
      explanation: question.explanation,
      estimated_time_seconds: question.estimatedSolveTimeSeconds,
      source_type: "generated",
      verification_status: "draft",
      publication_status: "draft",
      created_by: actorId,
      updated_by: actorId,
    })
    .select("*")
    .single();

  if (saveError || !saved) {
    if (saveError?.code === "23505") {
      throw new Error("A generated question with this fingerprint already exists.");
    }
    throw new Error("Unable to save the generated equation draft.");
  }

  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: saved.id,
    version: 1,
    snapshot: questionSnapshot(saved, []),
    change_summary: "Validated generated equation saved as a draft.",
    changed_by: actorId,
  });
  if (versionError) {
    await admin.from("questions").delete().eq("id", saved.id);
    throw new Error("The draft could not be versioned and was not retained.");
  }

  await writeAudit(actorId, "question.generated", saved.id, {
    fingerprint: question.metadata.fingerprint,
    seed: question.metadata.seed,
    generator_version: question.metadata.generatorVersion,
    validator_version: question.metadata.validatorVersion,
  });
  return saved.id as string;
}

export async function createGeneratedLatinDraft(
  actorId: string,
  question: LatinSquareQuestion,
): Promise<string> {
  if (
    !question.validation.valid ||
    !question.validation.checks.every((validationCheck) => validationCheck.passed)
  ) {
    throw new Error("Only fully validated generated Latin squares can be saved.");
  }

  const admin = createSupabaseAdminClient();
  const structuredData = {
    schemaVersion: 1,
    task: question.structuredData,
    presentation: question.presentation,
    response: question.response,
    deductionTrace: question.deductionTrace,
  };
  const metadata = {
    generation: question.metadata,
    validation: question.validation,
    correctAnswer: question.correctAnswer,
  };
  const { data: saved, error: saveError } = await admin
    .from("questions")
    .insert({
      module: "core",
      question_type: "latin_square",
      topic: question.topic,
      subtopic: question.subtopic ?? null,
      difficulty: question.metadata.calculatedDifficulty,
      question_text: question.presentation.prompt,
      structured_data: structuredData,
      metadata,
      explanation: question.explanation,
      estimated_time_seconds: question.estimatedSolveTimeSeconds,
      source_type: "generated",
      verification_status: "draft",
      publication_status: "draft",
      created_by: actorId,
      updated_by: actorId,
    })
    .select("*")
    .single();

  if (saveError || !saved) {
    if (saveError?.code === "23505") {
      throw new Error("A generated Latin square with this fingerprint already exists.");
    }
    throw new Error("Unable to save the generated Latin-square draft.");
  }

  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: saved.id,
    version: 1,
    snapshot: questionSnapshot(saved, []),
    change_summary: "Validated generated Latin square saved as a draft.",
    changed_by: actorId,
  });
  if (versionError) {
    await admin.from("questions").delete().eq("id", saved.id);
    throw new Error("The Latin-square draft could not be versioned and was not retained.");
  }

  await writeAudit(actorId, "question.generated", saved.id, {
    fingerprint: question.metadata.fingerprint,
    seed: question.metadata.seed,
    generator_version: question.metadata.generatorVersion,
    validator_version: question.metadata.validatorVersion,
  });
  return saved.id as string;
}

export async function createGeneratedFigureDraft(
  actorId: string,
  question: FigureSequenceQuestion,
): Promise<string> {
  if (!question.validation.valid || !question.validation.checks.every((item) => item.passed)) {
    throw new Error("Only fully validated generated figure sequences can be saved.");
  }
  const admin = createSupabaseAdminClient();
  const { data: saved, error: saveError } = await admin.from("questions").insert({
    module: "core",
    question_type: "figure_sequence",
    topic: question.topic,
    subtopic: question.subtopic ?? null,
    difficulty: question.metadata.calculatedDifficulty,
    question_text: question.presentation.prompt,
    structured_data: {
      schemaVersion: 1,
      task: question.structuredData,
      presentation: question.presentation,
      response: question.response,
      sequence: question.sequence,
      solutionFrames: question.solutionFrames,
    },
    metadata: {
      generation: question.metadata,
      validation: question.validation,
      correctAnswer: question.correctAnswer,
    },
    explanation: question.explanation,
    estimated_time_seconds: question.estimatedSolveTimeSeconds,
    source_type: "generated",
    verification_status: "draft",
    publication_status: "draft",
    created_by: actorId,
    updated_by: actorId,
  }).select("*").single();
  if (saveError || !saved) {
    if (saveError?.code === "23505") throw new Error("A generated figure sequence with this fingerprint already exists.");
    throw new Error("Unable to save the generated figure-sequence draft.");
  }
  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: saved.id,
    version: 1,
    snapshot: questionSnapshot(saved, []),
    change_summary: "Validated generated figure sequence saved as a draft.",
    changed_by: actorId,
  });
  if (versionError) {
    await admin.from("questions").delete().eq("id", saved.id);
    throw new Error("The figure-sequence draft could not be versioned and was not retained.");
  }
  await writeAudit(actorId, "question.generated", saved.id, {
    fingerprint: question.metadata.fingerprint,
    seed: question.metadata.seed,
    generator_version: question.metadata.generatorVersion,
    validator_version: question.metadata.validatorVersion,
  });
  return saved.id as string;
}

export async function createGeneratedComputerScienceDraft(
  actorId: string,
  unit: GeneratedComputerScienceUnit,
): Promise<string> {
  if (!unit.validation.valid || !unit.validation.checks.every((item) => item.passed)) {
    throw new Error("Only fully validated generated subject units can be saved.");
  }
  const admin = createSupabaseAdminClient();
  const { data: saved, error: saveError } = await admin.from("questions").insert({
    module: "computer_science",
    question_type: "computer_science",
    subject: "Computer Science",
    topic: unit.topic,
    subtopic: unit.family,
    difficulty: unit.metadata.calculatedDifficulty,
    question_text: unit.stimulus.title ?? "Computer Science subject stimulus",
    structured_data: { schemaVersion: unit.schemaVersion, family: unit.family, stimulus: unit.stimulus, questions: unit.questions, task: unit.structuredData },
    metadata: { generation: unit.metadata, validation: unit.validation },
    explanation: unit.questions.map((question) => question.explanation).join("\n"),
    estimated_time_seconds: unit.questions.reduce((total, question) => total + question.estimatedSolveTimeSeconds, 0),
    source_type: "generated",
    verification_status: "draft",
    publication_status: "draft",
    created_by: actorId,
    updated_by: actorId,
  }).select("*").single();
  if (saveError || !saved) {
    if (saveError?.code === "23505") throw new Error("A generated subject unit with this fingerprint already exists.");
    throw new Error("Unable to save the generated subject-unit draft.");
  }
  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: saved.id,
    version: 1,
    snapshot: questionSnapshot(saved, []),
    change_summary: `Validated ${unit.topic} subject unit saved as a draft.`,
    changed_by: actorId,
  });
  if (versionError) {
    await admin.from("questions").delete().eq("id", saved.id);
    throw new Error("The subject-unit draft could not be versioned and was not retained.");
  }
  await writeAudit(actorId, "question.generated", saved.id, {
    fingerprint: unit.metadata.fingerprint,
    seed: unit.metadata.seed,
    generator_version: unit.metadata.generatorVersion,
    validator_version: unit.metadata.validatorVersion,
    family: unit.family,
  });
  return saved.id as string;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = createSupabaseAdminClient();
  const [
    total,
    underReview,
    approvedDrafts,
    published,
    openReports,
    publishedTests,
  ] = await Promise.all([
    admin.from("questions").select("id", { count: "exact", head: true }),
    admin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "under_review"),
    admin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "approved")
      .eq("publication_status", "draft"),
    admin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("publication_status", "published"),
    admin
      .from("question_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .neq("id", "00000000-0000-4000-8000-000000000001"),
  ]);

  if (
    [total, underReview, approvedDrafts, published, openReports, publishedTests].some(
      (result) => result.error,
    )
  ) {
    throw new Error("Unable to load administrative metrics.");
  }

  return {
    totalQuestions: total.count ?? 0,
    underReview: underReview.count ?? 0,
    approvedDrafts: approvedDrafts.count ?? 0,
    publishedQuestions: published.count ?? 0,
    openReports: openReports.count ?? 0,
    publishedTests: publishedTests.count ?? 0,
  };
}

export async function createQuestion(
  actorId: string,
  input: QuestionAuthoringInput,
) {
  if (input.intent === "correction") {
    throw new Error("Published correction mode requires an existing question.");
  }

  const admin = createSupabaseAdminClient();
  const structuredData = input.structuredData
    ? (JSON.parse(input.structuredData) as Record<string, unknown>)
    : {};
  const { data: question, error: questionError } = await admin
    .from("questions")
    .insert({
      module: input.module,
      question_type: input.questionType,
      subject: input.subject,
      topic: input.topic,
      subtopic: input.subtopic,
      difficulty: input.difficulty,
      question_text: input.questionText,
      passage: input.passage,
      code: input.code,
      formula: input.formula,
      structured_data: structuredData,
      image_url: input.imageUrl,
      explanation: input.explanation,
      estimated_time_seconds: input.estimatedTimeSeconds,
      source_type: input.sourceType,
      verification_status:
        input.intent === "review" ? "under_review" : "draft",
      publication_status: "draft",
      created_by: actorId,
      updated_by: actorId,
    })
    .select("*")
    .single();

  if (questionError || !question) throw new Error("Unable to create this question.");

  const optionRows = input.options.map((content, index) => ({
    question_id: question.id,
    label: String.fromCharCode(65 + index),
    content,
    sort_order: index + 1,
  }));
  const { data: options, error: optionError } = await admin
    .from("question_options")
    .insert(optionRows)
    .select("*");

  if (optionError || !options || options.length !== 4) {
    await admin.from("questions").delete().eq("id", question.id);
    throw new Error("Unable to save all four answer options.");
  }

  const correctOption = options[input.correctOptionIndex];
  const { data: completedQuestion, error: updateError } = await admin
    .from("questions")
    .update({ correct_option_id: correctOption.id })
    .eq("id", question.id)
    .select("*")
    .single();

  if (updateError || !completedQuestion) {
    await admin.from("questions").delete().eq("id", question.id);
    throw new Error("Unable to set the correct answer.");
  }

  const snapshot = questionSnapshot(completedQuestion, options);
  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: question.id,
    version: 1,
    snapshot,
    change_summary:
      input.intent === "review"
        ? "Question created and submitted for review."
        : "Question draft created.",
    changed_by: actorId,
  });
  if (versionError) throw new Error("Question created, but versioning failed.");

  await writeAudit(actorId, "question.created", question.id, {
    verification_status: completedQuestion.verification_status,
  });
  return {
    id: question.id as string,
    status: completedQuestion.verification_status as string,
    version: 1,
    wasPublished: false,
  };
}

export async function getEditableQuestion(
  questionId: string,
): Promise<EditableQuestion | null> {
  const admin = createSupabaseAdminClient();
  const { data: question, error } = await admin
    .from("questions")
    .select(
      "id, module, question_type, subject, topic, subtopic, difficulty, question_text, passage, code, formula, structured_data, image_url, explanation, estimated_time_seconds, source_type, correct_option_id, verification_status, publication_status",
    )
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw new Error("Unable to load this question.");
  if (!question) return null;
  if (
    !canAdminEditQuestion(
      question.verification_status,
      question.publication_status,
    )
  ) {
    throw new Error(
      "Only draft, rejected, or currently published questions can be edited.",
    );
  }

  const { data: options, error: optionError } = await admin
    .from("question_options")
    .select("id, content, sort_order")
    .eq("question_id", questionId)
    .order("sort_order", { ascending: true });
  if (optionError || !options || options.length !== 4) {
    throw new Error("This question does not have a valid four-option structure.");
  }

  return {
    id: question.id,
    module: question.module,
    questionType: question.question_type,
    subject: question.subject,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionText: question.question_text,
    passage: question.passage,
    code: question.code,
    formula: question.formula,
    structuredData:
      question.structured_data &&
      Object.keys(question.structured_data as Record<string, unknown>).length
        ? JSON.stringify(question.structured_data, null, 2)
        : "",
    imageUrl: question.image_url,
    explanation: question.explanation,
    estimatedTimeSeconds: question.estimated_time_seconds,
    sourceType: question.source_type,
    options: options.map((option) => option.content),
    correctOptionIndex: Math.max(
      0,
      options.findIndex((option) => option.id === question.correct_option_id),
    ),
    verificationStatus: question.verification_status,
    publicationStatus: question.publication_status,
  } as EditableQuestion;
}

export async function updateQuestion(
  actorId: string,
  questionId: string,
  input: QuestionAuthoringInput,
) {
  const admin = createSupabaseAdminClient();
  const { data: current } = await admin
    .from("questions")
    .select("id, version, verification_status, publication_status")
    .eq("id", questionId)
    .maybeSingle();
  if (
    !current ||
    !canAdminEditQuestion(
      current.verification_status,
      current.publication_status,
    )
  ) {
    throw new Error(
      "Only draft, rejected, or currently published questions can be edited.",
    );
  }
  const isPublishedCorrection = current.publication_status === "published";
  if (!isPublishedCorrection && input.intent === "correction") {
    throw new Error("Correction mode is only available for published questions.");
  }

  const { data: options } = await admin
    .from("question_options")
    .select("id, label, sort_order")
    .eq("question_id", questionId)
    .order("sort_order", { ascending: true });
  if (!options || options.length !== 4) {
    throw new Error("This question does not have four editable options.");
  }

  const nextVersion = Number(current.version) + 1;
  const structuredData = input.structuredData
    ? (JSON.parse(input.structuredData) as Record<string, unknown>)
    : {};
  const { data: updated, error: updateError } = await admin
    .from("questions")
    .update({
      module: input.module,
      question_type: input.questionType,
      subject: input.subject,
      topic: input.topic,
      subtopic: input.subtopic,
      difficulty: input.difficulty,
      question_text: input.questionText,
      passage: input.passage,
      code: input.code,
      formula: input.formula,
      structured_data: structuredData,
      image_url: input.imageUrl,
      explanation: input.explanation,
      estimated_time_seconds: input.estimatedTimeSeconds,
      source_type: input.sourceType,
      correct_option_id: options[input.correctOptionIndex].id,
      verification_status:
        isPublishedCorrection
          ? current.verification_status
          : input.intent === "review"
            ? "under_review"
            : "draft",
      version: nextVersion,
      updated_by: actorId,
    })
    .eq("id", questionId)
    .select("*")
    .single();
  if (updateError || !updated) throw new Error("Unable to update this question.");

  const updatedOptions = await Promise.all(
    options.map((option, index) =>
      admin
        .from("question_options")
        .update({ content: input.options[index] })
        .eq("id", option.id)
        .select("*")
        .single(),
    ),
  );
  if (updatedOptions.some((result) => result.error)) {
    throw new Error("Question updated, but one or more options could not be saved.");
  }
  const optionRows = updatedOptions.flatMap((result) =>
    result.data ? [result.data] : [],
  );
  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: questionId,
    version: nextVersion,
    snapshot: questionSnapshot(updated, optionRows),
    change_summary:
      isPublishedCorrection
        ? "Published question corrected by an administrator."
        : input.intent === "review"
        ? "Question updated and resubmitted for review."
        : "Question draft updated.",
    changed_by: actorId,
  });
  if (versionError) throw new Error("Question updated, but versioning failed.");

  await writeAudit(actorId, "question.updated", questionId, {
    version: nextVersion,
    verification_status: updated.verification_status,
    publication_status: updated.publication_status,
    correction: isPublishedCorrection,
  });
  return {
    id: questionId,
    status: updated.verification_status as string,
    version: nextVersion,
    wasPublished: isPublishedCorrection,
  };
}

export async function getReviewQueue(
  includeAdminStates: boolean,
): Promise<ReviewQueueQuestion[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("questions")
    .select(
      "id, module, question_type, topic, subtopic, difficulty, question_text, passage, code, formula, explanation, correct_option_id, verification_status, publication_status, version, created_at, source_type, structured_data, metadata",
    )
    .order("updated_at", { ascending: false })
    .limit(100);
  query = includeAdminStates
    ? query.in("verification_status", ["draft", "under_review", "approved", "rejected"])
    : query.eq("verification_status", "under_review");

  const { data: questionData, error } = await query;
  if (error) throw new Error("Unable to load the question review queue.");
  const questions = questionData ?? [];
  const ids = questions.map((question) => question.id);
  const { data: optionData } = ids.length
    ? await admin
        .from("question_options")
        .select("id, question_id, label, content, sort_order")
        .in("question_id", ids)
        .order("sort_order", { ascending: true })
    : { data: [] };
  const options = optionData ?? [];

  return questions.map((question) => ({
    id: question.id,
    module: question.module,
    questionType: question.question_type,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionText: question.question_text,
    passage: question.passage,
    code: question.code,
    formula: question.formula,
    sourceType: question.source_type,
    structuredData: question.structured_data,
    metadata: question.metadata,
    explanation: question.explanation,
    correctOptionId: question.correct_option_id,
    verificationStatus: question.verification_status,
    publicationStatus: question.publication_status,
    version: question.version,
    createdAt: question.created_at,
    options: options
      .filter((option) => option.question_id === question.id)
      .map((option) => ({
        id: option.id,
        label: option.label,
        content: option.content,
      })),
  })) as ReviewQueueQuestion[];
}

export async function reviewQuestion(
  actorId: string,
  input: {
    questionId: string;
    decision: "approved" | "rejected" | "changes_requested";
    comments: string | null;
  },
) {
  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("questions")
    .select("id, verification_status")
    .eq("id", input.questionId)
    .maybeSingle();
  if (!question || question.verification_status !== "under_review") {
    throw new Error("Only questions under review can receive a decision.");
  }

  const verificationStatus =
    input.decision === "approved"
      ? "approved"
      : input.decision === "rejected"
        ? "rejected"
        : "draft";
  const { error: reviewError } = await admin.from("question_reviews").insert({
    question_id: input.questionId,
    reviewer_id: actorId,
    decision: input.decision,
    comments: input.comments,
  });
  if (reviewError) throw new Error("Unable to record the review decision.");

  const { error: updateError } = await admin
    .from("questions")
    .update({
      verification_status: verificationStatus,
      updated_by: actorId,
    })
    .eq("id", input.questionId);
  if (updateError) throw new Error("Unable to update the question status.");

  await writeAudit(actorId, `question.review.${input.decision}`, input.questionId, {
    comments: input.comments,
  });
}

export async function updateQuestionLifecycle(
  actorId: string,
  questionId: string,
  action: "submit_review" | "publish" | "retire",
) {
  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("questions")
    .select("id, verification_status, publication_status, correct_option_id, question_type, source_type, structured_data, metadata")
    .eq("id", questionId)
    .maybeSingle();
  if (!question) throw new Error("Question not found.");

  if (action === "submit_review") {
    if (!["draft", "rejected"].includes(question.verification_status)) {
      throw new Error("Only draft or rejected questions can be submitted.");
    }
    const { error } = await admin
      .from("questions")
      .update({ verification_status: "under_review", updated_by: actorId })
      .eq("id", questionId);
    if (error) throw new Error("Unable to submit this question for review.");
  } else if (action === "publish") {
    const { count } = await admin
      .from("question_options")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId);
    const decision = evaluatePublication({
      verificationStatus: question.verification_status,
      questionType: question.question_type,
      sourceType: question.source_type,
      optionCount: count ?? 0,
      correctOptionId: question.correct_option_id,
      structuredData: question.structured_data,
      metadata: question.metadata,
    });
    if (!decision.allowed) throw new Error(decision.reason);
    const { error } = await admin
      .from("questions")
      .update({
        publication_status: "published",
        published_at: new Date().toISOString(),
        retired_at: null,
        updated_by: actorId,
      })
      .eq("id", questionId);
    if (error) throw new Error("Unable to publish this question.");
  } else {
    if (question.publication_status !== "published") {
      throw new Error("Only published questions can be retired.");
    }
    const { error } = await admin
      .from("questions")
      .update({
        publication_status: "retired",
        retired_at: new Date().toISOString(),
        updated_by: actorId,
      })
      .eq("id", questionId);
    if (error) throw new Error("Unable to retire this question.");
  }

  await writeAudit(actorId, `question.lifecycle.${action}`, questionId);
}
