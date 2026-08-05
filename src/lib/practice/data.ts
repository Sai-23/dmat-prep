import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PracticeConfig,
  PracticeFilters,
  PracticeQuestion,
} from "@/lib/practice/schemas";

const PRACTICE_TEST_ID = "00000000-0000-4000-8000-000000000001";

type QuestionRow = {
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

function shuffled<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export async function getPracticeFilters(): Promise<PracticeFilters> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("module, topic")
    .eq("verification_status", "approved")
    .eq("publication_status", "published");

  if (error) throw new Error("Unable to load practice filters.");

  const topicsByModule: PracticeFilters["topicsByModule"] = {
    core: [],
    computer_science: [],
  };

  for (const row of data ?? []) {
    const questionModule = row.module as PracticeQuestion["module"];
    if (
      (questionModule === "core" || questionModule === "computer_science") &&
      typeof row.topic === "string" &&
      !topicsByModule[questionModule].includes(row.topic)
    ) {
      topicsByModule[questionModule].push(row.topic);
    }
  }

  topicsByModule.core.sort();
  topicsByModule.computer_science.sort();
  return { topicsByModule };
}

export async function createPracticeAttempt(
  userId: string,
  config: PracticeConfig,
) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("questions")
    .select(
      "id, module, question_type, topic, subtopic, difficulty, question_text, passage, code, formula, table_data, image_url, estimated_time_seconds",
    )
    .eq("module", config.module)
    .eq("verification_status", "approved")
    .eq("publication_status", "published")
    .not("correct_option_id", "is", null);

  if (config.questionId) query = query.eq("id", config.questionId);
  if (config.questionType !== "any") {
    query = query.eq("question_type", config.questionType);
  }
  if (config.topic) query = query.eq("topic", config.topic);
  if (config.difficulty !== "any") query = query.eq("difficulty", config.difficulty);
  if (config.sourceType !== "any") query = query.eq("source_type", config.sourceType);

  const { data: questionData, error: questionError } = await query;
  if (questionError) throw new Error("Unable to load questions for this session.");

  const selectedRows = shuffled((questionData ?? []) as QuestionRow[]).slice(
    0,
    config.quantity,
  );

  if (!selectedRows.length) {
    return {
      error:
        "No published questions match these filters. Change the filters or publish more questions.",
    } as const;
  }

  const selectedIds = selectedRows.map((question) => question.id);
  const { data: optionData, error: optionError } = await admin
    .from("question_options")
    .select("id, question_id, label, content, sort_order")
    .in("question_id", selectedIds)
    .order("sort_order", { ascending: true });

  if (optionError) throw new Error("Unable to load question options.");

  const optionRows = (optionData ?? []) as OptionRow[];
  const completeRows = selectedRows.filter(
    (question) =>
      optionRows.filter((option) => option.question_id === question.id).length === 4,
  );

  if (!completeRows.length) {
    return {
      error: "Matching questions do not yet have four answer options.",
    } as const;
  }

  const durationSeconds = completeRows.reduce(
    (total, question) => total + question.estimated_time_seconds,
    0,
  );
  const expiresAt =
    config.timingMode === "timed"
      ? new Date(Date.now() + durationSeconds * 1000).toISOString()
      : null;

  const { data: attempt, error: attemptError } = await admin
    .from("test_attempts")
    .insert({
      test_id: PRACTICE_TEST_ID,
      user_id: userId,
      status: "in_progress",
      expires_at: expiresAt,
      randomization_seed: crypto.randomUUID(),
    })
    .select("id, started_at")
    .single();

  if (attemptError || !attempt) {
    throw new Error(
      "Unable to create the practice attempt. Apply the Phase 4 database migration first.",
    );
  }

  const { error: responseError } = await admin.from("user_responses").insert(
    completeRows.map((question) => ({
      attempt_id: attempt.id,
      question_id: question.id,
      response_status: "unanswered",
      shown_at: attempt.started_at,
    })),
  );

  if (responseError) throw new Error("Unable to initialize practice responses.");

  const questions: PracticeQuestion[] = completeRows.map((question) => ({
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
    options: optionRows
      .filter((option) => option.question_id === question.id)
      .map((option) => ({
        id: option.id,
        label: option.label,
        content: option.content,
      })),
  }));

  return {
    error: null,
    attemptId: attempt.id as string,
    expiresAt,
    questions,
    requestedQuantity: config.quantity,
  } as const;
}

export async function recordPracticeAnswer(
  userId: string,
  input: {
    attemptId: string;
    questionId: string;
    optionId: string;
    timeSpentSeconds: number;
  },
) {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin
    .from("test_attempts")
    .select("id, status, user_id, expires_at")
    .eq("id", input.attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== userId || attempt.status !== "in_progress") {
    throw new Error("This practice attempt is no longer available.");
  }

  if (attempt.expires_at && new Date(attempt.expires_at).getTime() < Date.now()) {
    throw new Error("Time has expired for this practice session.");
  }

  const [{ data: response }, { data: question }, { data: option }] =
    await Promise.all([
      admin
        .from("user_responses")
        .select("id")
        .eq("attempt_id", input.attemptId)
        .eq("question_id", input.questionId)
        .maybeSingle(),
      admin
        .from("questions")
        .select("correct_option_id, explanation")
        .eq("id", input.questionId)
        .maybeSingle(),
      admin
        .from("question_options")
        .select("id, question_id")
        .eq("id", input.optionId)
        .maybeSingle(),
    ]);

  if (
    !response ||
    !question?.correct_option_id ||
    !option ||
    option.question_id !== input.questionId
  ) {
    throw new Error("The submitted answer is invalid.");
  }

  const isCorrect = input.optionId === question.correct_option_id;
  const { error } = await admin
    .from("user_responses")
    .update({
      selected_option_id: input.optionId,
      is_correct: isCorrect,
      response_status: "answered",
      time_spent_seconds: input.timeSpentSeconds,
      answered_at: new Date().toISOString(),
    })
    .eq("id", response.id);

  if (error) throw new Error("Unable to save this answer.");

  return {
    isCorrect,
    correctOptionId: question.correct_option_id as string,
    explanation: question.explanation as string,
  };
}

export async function finishPracticeAttempt(
  userId: string,
  attemptId: string,
  finalStatus: "submitted" | "auto_submitted" = "submitted",
) {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin
    .from("test_attempts")
    .select("id, user_id, status, accuracy, score, total_time_seconds")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== userId) {
    throw new Error("Practice attempt not found.");
  }

  if (attempt.status !== "in_progress") {
    return {
      correct: Number(attempt.score ?? 0),
      total: 0,
      accuracy: Number(attempt.accuracy ?? 0),
      totalTimeSeconds: attempt.total_time_seconds as number,
    };
  }

  const { data: responses, error: responseError } = await admin
    .from("user_responses")
    .select("question_id, is_correct, response_status, time_spent_seconds")
    .eq("attempt_id", attemptId);

  if (responseError || !responses?.length) {
    throw new Error("Unable to complete this practice attempt.");
  }

  const questionIds = responses.map((response) => response.question_id);
  const { data: questions, error: questionError } = await admin
    .from("questions")
    .select("id, module, topic, subtopic")
    .in("id", questionIds);

  if (questionError) throw new Error("Unable to update topic performance.");

  const correct = responses.filter((response) => response.is_correct === true).length;
  const total = responses.length;
  const totalTimeSeconds = responses.reduce(
    (sum, response) => sum + Number(response.time_spent_seconds),
    0,
  );
  const accuracy = total ? (correct / total) * 100 : 0;

  const { data: completedAttempt, error: attemptError } = await admin
    .from("test_attempts")
    .update({
      status: finalStatus,
      submitted_at: new Date().toISOString(),
      score: correct,
      accuracy,
      total_time_seconds: totalTimeSeconds,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (attemptError || !completedAttempt) {
    throw new Error("This practice attempt has already been completed.");
  }

  const questionById = new Map((questions ?? []).map((question) => [question.id, question]));
  const groups = new Map<
    string,
    {
      module: string;
      topic: string;
      subtopic: string;
      correct: number;
      incorrect: number;
      unanswered: number;
      time: number;
    }
  >();

  for (const response of responses) {
    const question = questionById.get(response.question_id);
    if (!question) continue;
    const subtopic = question.subtopic ?? "";
    const key = `${question.module}:${question.topic}:${subtopic}`;
    const group = groups.get(key) ?? {
      module: question.module,
      topic: question.topic,
      subtopic,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      time: 0,
    };

    if (response.response_status !== "answered") group.unanswered += 1;
    else if (response.is_correct) group.correct += 1;
    else group.incorrect += 1;
    group.time += Number(response.time_spent_seconds);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    const { data: existing } = await admin
      .from("user_topic_performance")
      .select(
        "attempts_count, correct_count, incorrect_count, unanswered_count, average_response_time_seconds",
      )
      .eq("user_id", userId)
      .eq("module", group.module)
      .eq("topic", group.topic)
      .eq("subtopic", group.subtopic)
      .maybeSingle();

    const sessionAttempts = group.correct + group.incorrect + group.unanswered;
    const oldAttempts = Number(existing?.attempts_count ?? 0);
    const attemptsCount = oldAttempts + sessionAttempts;
    const correctCount = Number(existing?.correct_count ?? 0) + group.correct;
    const incorrectCount = Number(existing?.incorrect_count ?? 0) + group.incorrect;
    const unansweredCount = Number(existing?.unanswered_count ?? 0) + group.unanswered;
    const previousTime =
      Number(existing?.average_response_time_seconds ?? 0) * oldAttempts;

    const { error: performanceError } = await admin
      .from("user_topic_performance")
      .upsert(
      {
        user_id: userId,
        module: group.module,
        topic: group.topic,
        subtopic: group.subtopic,
        attempts_count: attemptsCount,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unansweredCount,
        average_response_time_seconds: attemptsCount
          ? (previousTime + group.time) / attemptsCount
          : null,
        accuracy: attemptsCount ? (correctCount / attemptsCount) * 100 : null,
        last_practiced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module,topic,subtopic" },
      );

    if (performanceError) {
      throw new Error("The result was saved, but topic performance could not be updated.");
    }
  }

  return { correct, total, accuracy, totalTimeSeconds };
}
