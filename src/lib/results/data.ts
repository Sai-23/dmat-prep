import "server-only";

import {
  buildResultBreakdown,
  buildResultRecommendation,
} from "@/lib/results/analytics";
import type {
  AttemptResult,
  ResultHistoryItem,
  ResultQuestion,
} from "@/lib/results/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AttemptRow = {
  id: string;
  test_id: string;
  status: "submitted" | "auto_submitted";
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  accuracy: number | null;
  total_time_seconds: number;
};

type ResponseRow = {
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean | null;
  is_marked_for_review: boolean;
  response_status: "unanswered" | "answered" | "skipped";
  time_spent_seconds: number;
};

type QuestionRow = {
  id: string;
  module: ResultQuestion["module"];
  question_type: ResultQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: ResultQuestion["difficulty"];
  question_text: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  correct_option_id: string | null;
  explanation: string;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  content: string;
  sort_order: number;
};

export async function getResultHistory(
  userId: string,
): Promise<ResultHistoryItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("test_attempts")
    .select(
      "id, test_id, status, started_at, submitted_at, score, accuracy, total_time_seconds",
    )
    .eq("user_id", userId)
    .in("status", ["submitted", "auto_submitted"])
    .order("submitted_at", { ascending: false })
    .limit(30);

  if (error) throw new Error("Unable to load your result history.");
  const attempts = (data ?? []) as AttemptRow[];
  const testIds = [...new Set(attempts.map((attempt) => attempt.test_id))];
  const { data: tests } = testIds.length
    ? await admin.from("tests").select("id, title").in("id", testIds)
    : { data: [] };
  const titleByTestId = new Map(
    (tests ?? []).map((test) => [test.id as string, test.title as string]),
  );

  return attempts.map((attempt) => ({
    id: attempt.id,
    testTitle: titleByTestId.get(attempt.test_id) ?? "Assessment",
    status: attempt.status,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    score: Number(attempt.score ?? 0),
    accuracy: Number(attempt.accuracy ?? 0),
    totalTimeSeconds: attempt.total_time_seconds,
  }));
}

export async function getAttemptResult(
  userId: string,
  attemptId: string,
): Promise<AttemptResult | null> {
  const admin = createSupabaseAdminClient();
  const { data: attemptData, error: attemptError } = await admin
    .from("test_attempts")
    .select(
      "id, test_id, user_id, status, started_at, submitted_at, score, accuracy, total_time_seconds",
    )
    .eq("id", attemptId)
    .eq("user_id", userId)
    .in("status", ["submitted", "auto_submitted"])
    .maybeSingle();

  if (attemptError) throw new Error("Unable to load this result.");
  if (!attemptData) return null;
  const attempt = attemptData as AttemptRow & { test_id: string };

  const [{ data: responseData }, { data: testData }] = await Promise.all([
    admin
      .from("user_responses")
      .select(
        "question_id, selected_option_id, is_correct, is_marked_for_review, response_status, time_spent_seconds",
      )
      .eq("attempt_id", attemptId)
      .order("created_at", { ascending: true }),
    admin.from("tests").select("title").eq("id", attempt.test_id).maybeSingle(),
  ]);
  const responses = (responseData ?? []) as ResponseRow[];
  const questionIds = responses.map((response) => response.question_id);

  const [
    { data: questionData, error: questionError },
    { data: optionData },
    { data: sectionData },
    { data: bookmarkData },
  ] = await Promise.all([
    admin
      .from("questions")
      .select(
        "id, module, question_type, topic, subtopic, difficulty, question_text, passage, code, formula, correct_option_id, explanation",
      )
      .in("id", questionIds),
    admin
      .from("question_options")
      .select("id, question_id, label, content, sort_order")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true }),
    admin
      .from("test_sections")
      .select("id, title")
      .eq("test_id", attempt.test_id),
    admin
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", questionIds),
  ]);

  if (questionError) throw new Error("Unable to load question review data.");
  const questions = (questionData ?? []) as QuestionRow[];
  const options = (optionData ?? []) as OptionRow[];
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const sections = sectionData ?? [];
  const sectionIds = sections.map((section) => section.id);
  const { data: mappingData } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("test_section_id, question_id")
        .in("test_section_id", sectionIds)
        .in("question_id", questionIds)
    : { data: [] };
  const sectionTitleById = new Map(
    sections.map((section) => [section.id as string, section.title as string]),
  );
  const bookmarkedQuestionIds = new Set(
    (bookmarkData ?? []).map((bookmark) => bookmark.question_id as string),
  );
  const sectionByQuestion = new Map(
    (mappingData ?? []).map((mapping) => [
      mapping.question_id as string,
      sectionTitleById.get(mapping.test_section_id as string) ?? "Test section",
    ]),
  );

  const resultQuestions: ResultQuestion[] = responses.flatMap((response) => {
    const question = questionById.get(response.question_id);
    if (!question?.correct_option_id) return [];

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
        options: options
          .filter((option) => option.question_id === question.id)
          .map((option) => ({
            id: option.id,
            label: option.label,
            content: option.content,
          })),
        sectionTitle: sectionByQuestion.get(question.id) ?? "Focused Practice",
        selectedOptionId: response.selected_option_id,
        correctOptionId: question.correct_option_id,
        explanation: question.explanation,
        responseStatus: response.response_status,
        isCorrect: response.is_correct === true,
        markedForReview: response.is_marked_for_review,
        isBookmarked: bookmarkedQuestionIds.has(question.id),
        timeSpentSeconds: response.time_spent_seconds,
      },
    ];
  });

  const correctCount = resultQuestions.filter((question) => question.isCorrect).length;
  const answeredCount = resultQuestions.filter(
    (question) => question.responseStatus === "answered",
  ).length;
  const unansweredCount = resultQuestions.length - answeredCount;
  const incorrectCount = answeredCount - correctCount;
  const score = correctCount;
  const accuracy = resultQuestions.length
    ? (correctCount / resultQuestions.length) * 100
    : 0;

  const topicBreakdown = buildResultBreakdown(
    resultQuestions.map((question) => ({
      label: question.topic,
      isCorrect: question.isCorrect,
      answered: question.responseStatus === "answered",
      timeSpentSeconds: question.timeSpentSeconds,
    })),
  );
  const difficultyBreakdown = buildResultBreakdown(
    resultQuestions.map((question) => ({
      label: question.difficulty,
      isCorrect: question.isCorrect,
      answered: question.responseStatus === "answered",
      timeSpentSeconds: question.timeSpentSeconds,
    })),
  );

  return {
    id: attempt.id,
    testTitle: (testData?.title as string | undefined) ?? "Assessment",
    status: attempt.status,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    totalTimeSeconds: attempt.total_time_seconds,
    score,
    accuracy,
    correctCount,
    incorrectCount,
    unansweredCount,
    answeredCount,
    topicBreakdown,
    difficultyBreakdown,
    questions: resultQuestions,
    recommendation: buildResultRecommendation(accuracy, topicBreakdown[0]),
  };
}
