import "server-only";

import { finishPracticeAttempt } from "@/lib/practice/data";
import type { PracticeQuestion } from "@/lib/practice/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { seededShuffle } from "@/lib/tests/randomization";
import type {
  TestAttemptPayload,
  TestCatalogItem,
  TestOverview,
  TestQuestion,
} from "@/lib/tests/schemas";

type PublishedTestRow = {
  id: string;
  title: string;
  description: string | null;
  test_type: TestCatalogItem["testType"];
  module: TestCatalogItem["module"];
  duration_seconds: number;
  instructions: string | null;
  is_premium: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
};

type SectionRow = {
  id: string;
  test_id: string;
  title: string;
  duration_seconds: number;
  sort_order: number;
};

type MappingRow = {
  test_section_id: string;
  question_id: string;
  sort_order: number;
};

type SafeQuestionRow = {
  id: string;
  module: PracticeQuestion["module"];
  question_type: PracticeQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: PracticeQuestion["difficulty"];
  question_text: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  table_data: unknown;
  image_url: string | null;
  estimated_time_seconds: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  content: string;
  sort_order: number;
};

async function hasPremiumAccess(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("status, ends_at")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"]);

  return (data ?? []).some(
    (subscription) =>
      !subscription.ends_at ||
      new Date(subscription.ends_at).getTime() > Date.now(),
  );
}

async function getPublishedTest(testId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tests")
    .select(
      "id, title, description, test_type, module, duration_seconds, instructions, is_premium, randomize_questions, randomize_options",
    )
    .eq("id", testId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error("Unable to load this test.");
  return data as PublishedTestRow | null;
}

async function assertTestAccess(userId: string, testId: string) {
  const test = await getPublishedTest(testId);
  if (!test) throw new Error("This test is unavailable.");
  if (test.is_premium && !(await hasPremiumAccess(userId))) {
    throw new Error("This is a premium test. Upgrade your plan to start it.");
  }
  return test;
}

export async function getTestCatalog(userId: string): Promise<TestCatalogItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: testData, error } = await admin
    .from("tests")
    .select(
      "id, title, description, test_type, module, duration_seconds, instructions, is_premium, randomize_questions, randomize_options",
    )
    .eq("is_published", true)
    .neq("id", "00000000-0000-4000-8000-000000000001")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load published tests.");
  const tests = (testData ?? []) as PublishedTestRow[];
  if (!tests.length) return [];

  const testIds = tests.map((test) => test.id);
  const [{ data: sectionData }, premiumAccess] = await Promise.all([
    admin
      .from("test_sections")
      .select("id, test_id, title, duration_seconds, sort_order")
      .in("test_id", testIds),
    hasPremiumAccess(userId),
  ]);
  const sections = (sectionData ?? []) as SectionRow[];
  const sectionIds = sections.map((section) => section.id);
  const { data: mappingData } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("test_section_id, question_id, sort_order")
        .in("test_section_id", sectionIds)
    : { data: [] };
  const mappings = (mappingData ?? []) as MappingRow[];

  return tests.map((test) => {
    const testSections = sections.filter((section) => section.test_id === test.id);
    const testSectionIds = new Set(testSections.map((section) => section.id));
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      testType: test.test_type,
      module: test.module,
      durationSeconds: test.duration_seconds,
      isPremium: test.is_premium,
      sectionCount: testSections.length,
      questionCount: mappings.filter((mapping) =>
        testSectionIds.has(mapping.test_section_id),
      ).length,
      hasAccess: !test.is_premium || premiumAccess,
    };
  });
}

export async function getTestOverview(
  userId: string,
  testId: string,
): Promise<TestOverview | null> {
  const test = await getPublishedTest(testId);
  if (!test) return null;

  const admin = createSupabaseAdminClient();
  const [{ data: sectionData }, premiumAccess] = await Promise.all([
    admin
      .from("test_sections")
      .select("id, test_id, title, duration_seconds, sort_order")
      .eq("test_id", testId)
      .order("sort_order", { ascending: true }),
    hasPremiumAccess(userId),
  ]);
  const sections = (sectionData ?? []) as SectionRow[];
  const sectionIds = sections.map((section) => section.id);
  const { data: mappingData } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("test_section_id, question_id, sort_order")
        .in("test_section_id", sectionIds)
    : { data: [] };
  const mappings = (mappingData ?? []) as MappingRow[];

  return {
    id: test.id,
    title: test.title,
    description: test.description,
    testType: test.test_type,
    module: test.module,
    durationSeconds: test.duration_seconds,
    instructions: test.instructions,
    isPremium: test.is_premium,
    sectionCount: sections.length,
    questionCount: mappings.length,
    hasAccess: !test.is_premium || premiumAccess,
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      durationSeconds: section.duration_seconds,
      questionCount: mappings.filter(
        (mapping) => mapping.test_section_id === section.id,
      ).length,
    })),
  };
}

export async function startTestAttempt(userId: string, testId: string) {
  const test = await assertTestAccess(userId, testId);
  const admin = createSupabaseAdminClient();

  const { data: currentAttempt } = await admin
    .from("test_attempts")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("test_id", testId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    currentAttempt?.expires_at &&
    new Date(currentAttempt.expires_at).getTime() > Date.now()
  ) {
    return { attemptId: currentAttempt.id as string, resumed: true };
  }

  if (currentAttempt) {
    await admin
      .from("test_attempts")
      .update({ status: "abandoned" })
      .eq("id", currentAttempt.id);
  }

  const { data: sections } = await admin
    .from("test_sections")
    .select("id")
    .eq("test_id", testId);
  const sectionIds = (sections ?? []).map((section) => section.id);
  const { data: mappings } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("question_id")
        .in("test_section_id", sectionIds)
    : { data: [] };
  const questionIds = [...new Set((mappings ?? []).map((row) => row.question_id))];

  if (!questionIds.length) throw new Error("This test does not contain any questions.");

  const seed = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + test.duration_seconds * 1000).toISOString();
  const { data: attempt, error } = await admin
    .from("test_attempts")
    .insert({
      test_id: testId,
      user_id: userId,
      status: "in_progress",
      expires_at: expiresAt,
      randomization_seed: seed,
    })
    .select("id")
    .single();

  if (error || !attempt) throw new Error("Unable to start this test.");

  const { error: responseError } = await admin.from("user_responses").insert(
    questionIds.map((questionId) => ({
      attempt_id: attempt.id,
      question_id: questionId,
      response_status: "unanswered",
    })),
  );
  if (responseError) throw new Error("Unable to initialize the test questions.");

  return { attemptId: attempt.id as string, resumed: false };
}

export async function getTestAttempt(
  userId: string,
  testId: string,
  attemptId: string,
): Promise<TestAttemptPayload> {
  const admin = createSupabaseAdminClient();
  const [{ data: attempt }, test] = await Promise.all([
    admin
      .from("test_attempts")
      .select("id, test_id, user_id, status, expires_at, randomization_seed")
      .eq("id", attemptId)
      .maybeSingle(),
    assertTestAccess(userId, testId),
  ]);

  if (
    !attempt ||
    attempt.user_id !== userId ||
    attempt.test_id !== testId ||
    attempt.status !== "in_progress" ||
    !attempt.expires_at
  ) {
    throw new Error("This test attempt is unavailable or already completed.");
  }

  const { data: sectionData } = await admin
    .from("test_sections")
    .select("id, test_id, title, duration_seconds, sort_order")
    .eq("test_id", testId)
    .order("sort_order", { ascending: true });
  const sections = (sectionData ?? []) as SectionRow[];
  const sectionIds = sections.map((section) => section.id);
  const { data: mappingData } = await admin
    .from("test_questions")
    .select("test_section_id, question_id, sort_order")
    .in("test_section_id", sectionIds)
    .order("sort_order", { ascending: true });
  const mappings = (mappingData ?? []) as MappingRow[];
  const seed = String(attempt.randomization_seed ?? attempt.id);

  const orderedMappings = sections.flatMap((section) => {
    const sectionMappings = mappings.filter(
      (mapping) => mapping.test_section_id === section.id,
    );
    return test.randomize_questions
      ? seededShuffle(sectionMappings, `${seed}:${section.id}`)
      : sectionMappings;
  });
  const questionIds = orderedMappings.map((mapping) => mapping.question_id);

  const [{ data: questionData }, { data: optionData }, { data: responseData }] =
    await Promise.all([
      admin
        .from("questions")
        .select(
          "id, module, question_type, topic, subtopic, difficulty, question_text, passage, code, formula, table_data, image_url, estimated_time_seconds",
        )
        .in("id", questionIds)
        .eq("verification_status", "approved")
        .eq("publication_status", "published"),
      admin
        .from("question_options")
        .select("id, question_id, label, content, sort_order")
        .in("question_id", questionIds)
        .order("sort_order", { ascending: true }),
      admin
        .from("user_responses")
        .select(
          "question_id, selected_option_id, is_marked_for_review, time_spent_seconds",
        )
        .eq("attempt_id", attemptId),
    ]);

  const questionById = new Map(
    ((questionData ?? []) as SafeQuestionRow[]).map((question) => [
      question.id,
      question,
    ]),
  );
  const options = (optionData ?? []) as OptionRow[];
  const sectionById = new Map(sections.map((section) => [section.id, section.title]));

  const questions: TestQuestion[] = orderedMappings.flatMap((mapping) => {
    const question = questionById.get(mapping.question_id);
    if (!question) return [];
    const questionOptions = options
      .filter((option) => option.question_id === question.id)
      .map((option) => ({
        id: option.id,
        label: option.label,
        content: option.content,
      }));

    return [
      {
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
        tableData: question.table_data,
        imageUrl: question.image_url,
        estimatedTimeSeconds: question.estimated_time_seconds,
        sectionTitle: sectionById.get(mapping.test_section_id) ?? "Test section",
        options: test.randomize_options
          ? seededShuffle(questionOptions, `${seed}:${question.id}`)
          : questionOptions,
      },
    ];
  });

  if (!questions.length) throw new Error("This test has no available published questions.");

  return {
    attemptId,
    title: test.title,
    durationSeconds: test.duration_seconds,
    expiresAt: attempt.expires_at,
    questions,
    initialResponses: (responseData ?? []).map((response) => ({
      questionId: response.question_id,
      selectedOptionId: response.selected_option_id,
      markedForReview: response.is_marked_for_review,
      timeSpentSeconds: response.time_spent_seconds,
    })),
  };
}

export async function saveTestResponse(
  userId: string,
  input: {
    attemptId: string;
    questionId: string;
    selectedOptionId: string | null;
    markedForReview: boolean;
    timeSpentSeconds: number;
  },
) {
  const admin = createSupabaseAdminClient();
  const [{ data: attempt }, { data: response }] = await Promise.all([
    admin
      .from("test_attempts")
      .select("id, user_id, status, expires_at")
      .eq("id", input.attemptId)
      .maybeSingle(),
    admin
      .from("user_responses")
      .select("id")
      .eq("attempt_id", input.attemptId)
      .eq("question_id", input.questionId)
      .maybeSingle(),
  ]);

  if (
    !attempt ||
    attempt.user_id !== userId ||
    attempt.status !== "in_progress" ||
    !response
  ) {
    throw new Error("This response cannot be updated.");
  }
  if (attempt.expires_at && new Date(attempt.expires_at).getTime() <= Date.now()) {
    throw new Error("Time has expired.");
  }

  if (input.selectedOptionId) {
    const { data: option } = await admin
      .from("question_options")
      .select("question_id")
      .eq("id", input.selectedOptionId)
      .maybeSingle();
    if (!option || option.question_id !== input.questionId) {
      throw new Error("The selected option is invalid.");
    }
  }

  const { error } = await admin
    .from("user_responses")
    .update({
      selected_option_id: input.selectedOptionId,
      response_status: input.selectedOptionId ? "answered" : "unanswered",
      is_marked_for_review: input.markedForReview,
      time_spent_seconds: input.timeSpentSeconds,
      answered_at: input.selectedOptionId ? new Date().toISOString() : null,
    })
    .eq("id", response.id);

  if (error) throw new Error("Unable to save this response.");
  return { saved: true };
}

export async function gradeAndSubmitTest(
  userId: string,
  attemptId: string,
  autoSubmitted: boolean,
) {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin
    .from("test_attempts")
    .select("id, user_id, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== userId || attempt.status !== "in_progress") {
    throw new Error("This test attempt is unavailable or already submitted.");
  }

  const { data: responses } = await admin
    .from("user_responses")
    .select("id, question_id, selected_option_id")
    .eq("attempt_id", attemptId);
  const questionIds = (responses ?? []).map((response) => response.question_id);
  const { data: questions } = await admin
    .from("questions")
    .select("id, correct_option_id")
    .in("id", questionIds);
  const correctByQuestion = new Map(
    (questions ?? []).map((question) => [question.id, question.correct_option_id]),
  );

  const gradingResults = await Promise.all(
    (responses ?? []).map((response) =>
      admin
        .from("user_responses")
        .update({
          is_correct:
            response.selected_option_id !== null &&
            response.selected_option_id === correctByQuestion.get(response.question_id),
        })
        .eq("id", response.id),
    ),
  );

  if (gradingResults.some((result) => result.error)) {
    throw new Error("Unable to grade every response.");
  }

  return finishPracticeAttempt(
    userId,
    attemptId,
    autoSubmitted ? "auto_submitted" : "submitted",
  );
}
