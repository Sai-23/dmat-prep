import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  DashboardAttempt,
  DashboardData,
  DashboardTask,
  TopicPerformance,
} from "@/types/analytics";

type LoadDashboardResult =
  | { data: DashboardData; error: null }
  | { data: null; error: string };

type ProfileRow = {
  display_name: string | null;
  full_name: string | null;
  target_exam_date: string | null;
};

type AttemptRow = {
  id: string;
  test_id: string;
  status: DashboardAttempt["status"];
  started_at: string;
  submitted_at: string | null;
  total_time_seconds: number;
  score: number | null;
  accuracy: number | null;
};

type TopicRow = {
  topic: string;
  subtopic: string;
  accuracy: number | null;
  average_response_time_seconds: number | null;
  attempts_count: number;
};

type TestRow = { id: string; title: string };
type PlanRow = { id: string };
type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  target_count: number | null;
  status: DashboardTask["status"];
  due_at: string | null;
};

export async function loadDashboardData(userId: string): Promise<LoadDashboardResult> {
  const supabase = await createSupabaseServerClient();

  const [profileResult, attemptsResult, topicsResult, bookmarksResult, planResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, full_name, target_exam_date")
        .eq("id", userId)
        .maybeSingle()
        .overrideTypes<ProfileRow | null, { merge: false }>(),
      supabase
        .from("test_attempts")
        .select(
          "id, test_id, status, started_at, submitted_at, total_time_seconds, score, accuracy",
        )
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .overrideTypes<AttemptRow[], { merge: false }>(),
      supabase
        .from("user_topic_performance")
        .select(
          "topic, subtopic, accuracy, average_response_time_seconds, attempts_count",
        )
        .eq("user_id", userId)
        .gt("attempts_count", 0)
        .order("accuracy", { ascending: true })
        .limit(5)
        .overrideTypes<TopicRow[], { merge: false }>(),
      supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("study_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("plan_date", { ascending: false })
        .limit(1)
        .maybeSingle()
        .overrideTypes<PlanRow | null, { merge: false }>(),
    ]);

  const firstError = [
    profileResult.error,
    attemptsResult.error,
    topicsResult.error,
    bookmarksResult.error,
    planResult.error,
  ].find(Boolean);

  if (firstError) {
    return { data: null, error: "We could not load your dashboard data. Try again shortly." };
  }

  const attemptRows = attemptsResult.data ?? [];
  const testIds = [...new Set(attemptRows.slice(0, 5).map((attempt) => attempt.test_id))];
  const testsResult = testIds.length
    ? await supabase
        .from("tests")
        .select("id, title")
        .in("id", testIds)
        .overrideTypes<TestRow[], { merge: false }>()
    : { data: [], error: null };

  const tasksResult = planResult.data
    ? await supabase
        .from("study_tasks")
        .select("id, title, description, topic, target_count, status, due_at")
        .eq("study_plan_id", planResult.data.id)
        .in("status", ["pending", "in_progress"])
        .order("sort_order", { ascending: true })
        .limit(4)
        .overrideTypes<TaskRow[], { merge: false }>()
    : { data: [], error: null };

  if (testsResult.error || tasksResult.error) {
    return { data: null, error: "We could not load your dashboard data. Try again shortly." };
  }

  const titleByTestId = new Map(
    (testsResult.data ?? []).map((test) => [test.id, test.title]),
  );

  const recentAttempts: DashboardAttempt[] = attemptRows.slice(0, 5).map((attempt) => ({
    id: attempt.id,
    testId: attempt.test_id,
    testTitle: titleByTestId.get(attempt.test_id) ?? "Practice test",
    status: attempt.status,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    totalTimeSeconds: attempt.total_time_seconds,
    score: attempt.score === null ? null : Number(attempt.score),
    accuracy: attempt.accuracy === null ? null : Number(attempt.accuracy),
  }));

  const completed = attemptRows.filter(
    (attempt) => attempt.status === "submitted" || attempt.status === "auto_submitted",
  );
  const accuracies = completed
    .map((attempt) => attempt.accuracy)
    .filter((accuracy): accuracy is number => accuracy !== null)
    .map(Number);
  const overallAccuracy = accuracies.length
    ? accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length
    : null;

  const weakTopics: TopicPerformance[] = (topicsResult.data ?? []).map((topic) => ({
    topic: topic.topic,
    subtopic: topic.subtopic || null,
    accuracy: Number(topic.accuracy ?? 0),
    averageTimeSeconds: Number(topic.average_response_time_seconds ?? 0),
    attempts: topic.attempts_count,
  }));

  const studyTasks: DashboardTask[] = (tasksResult.data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    topic: task.topic,
    targetCount: task.target_count,
    status: task.status,
    dueAt: task.due_at,
  }));

  return {
    data: {
      displayName:
        profileResult.data?.display_name ??
        profileResult.data?.full_name ??
        "Student",
      targetExamDate: profileResult.data?.target_exam_date ?? null,
      completedAttempts: completed.length,
      overallAccuracy,
      totalTimeSeconds: attemptRows.reduce(
        (total, attempt) => total + attempt.total_time_seconds,
        0,
      ),
      bookmarkCount: bookmarksResult.count ?? 0,
      recentAttempts,
      weakTopics,
      studyTasks,
    },
    error: null,
  };
}
