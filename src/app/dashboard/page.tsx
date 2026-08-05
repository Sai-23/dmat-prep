import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Target,
} from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { loadDashboardData } from "@/lib/dashboard/data";
import {
  buildRecommendations,
  daysUntil,
  formatStudyTime,
} from "@/lib/dashboard/recommendations";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const user = await requireUser();
  const result = await loadDashboardData(user.id);

  if (result.error || !result.data) {
    return (
      <PageShell
        eyebrow="Student dashboard"
        title="Your preparation workspace"
        description="Review progress, identify weak topics, and choose the next best study action."
      >
        <ErrorState
          title="Dashboard unavailable"
          description={result.error}
        />
      </PageShell>
    );
  }

  const data = result.data;
  const recommendations = buildRecommendations(
    data.completedAttempts,
    data.weakTopics,
  );
  const metrics = [
    {
      label: "Attempts completed",
      value: String(data.completedAttempts),
      detail: "Submitted tests",
      icon: CheckCircle2,
    },
    {
      label: "Overall accuracy",
      value:
        data.overallAccuracy === null
          ? "—"
          : `${Math.round(data.overallAccuracy)}%`,
      detail: "Across completed attempts",
      icon: Target,
    },
    {
      label: "Study time",
      value: formatStudyTime(data.totalTimeSeconds),
      detail: "Across all attempts",
      icon: Clock3,
    },
    {
      label: "Bookmarks",
      value: String(data.bookmarkCount),
      detail: "Questions saved",
      icon: Bookmark,
    },
  ];

  return (
    <PageShell
      eyebrow="Student dashboard"
      title={`Welcome back, ${data.displayName}`}
      description="Review progress, identify weak topics, and choose the next best study action."
    >
      {data.targetExamDate ? (
        <Card className="overflow-hidden border-primary bg-primary text-primary-foreground">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="rounded-md border border-primary-foreground/30 bg-primary-muted p-3">
                <CalendarDays aria-hidden="true" className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold opacity-80">Target exam date</p>
                <p className="mt-1 text-2xl font-semibold">
                  {daysUntil(data.targetExamDate)} days remaining
                </p>
                <p className="mt-1 text-sm opacity-80">
                  {dateFormatter.format(
                    new Date(`${data.targetExamDate}T00:00:00`),
                  )}
                </p>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/profile">Update target</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
                  </div>
                  <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recent attempts</CardTitle>
              <CardDescription>Your five most recent test sessions.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/results">
                View results <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentAttempts.length ? (
              <div className="divide-y divide-slate-100">
                {data.recentAttempts.map((attempt) => (
                  <div
                    className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                    key={attempt.id}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{attempt.testTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {dateFormatter.format(new Date(attempt.startedAt))}
                      </p>
                    </div>
                    <Badge
                      variant={
                        attempt.status === "submitted" ||
                        attempt.status === "auto_submitted"
                          ? "success"
                          : "subtle"
                      }
                    >
                      {attempt.status.replaceAll("_", " ")}
                    </Badge>
                    <p className="min-w-16 text-right font-semibold text-slate-900">
                      {attempt.accuracy === null
                        ? "—"
                        : `${Math.round(attempt.accuracy)}%`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-6 text-center">
                <p className="font-semibold text-slate-900">No attempts yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Take a diagnostic or mini mock to create your first performance
                  baseline.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/tests">Browse tests</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended next</CardTitle>
            <CardDescription>Actions based on your current activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((recommendation) => (
              <div className="rounded-2xl border border-slate-200 p-4" key={recommendation.title}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{recommendation.title}</p>
                  <Badge
                    variant={recommendation.priority === "high" ? "warning" : "subtle"}
                  >
                    {recommendation.priority}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {recommendation.description}
                </p>
              </div>
            ))}
            <Button asChild className="w-full" variant="secondary">
              <Link href="/practice">Start focused practice</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Topics to strengthen</CardTitle>
            <CardDescription>Lowest accuracy areas with recorded activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weakTopics.length ? (
              <div className="space-y-5">
                {data.weakTopics.map((topic) => (
                  <div key={`${topic.topic}-${topic.subtopic ?? ""}`}>
                    <div className="mb-2 flex items-end justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{topic.topic}</p>
                        <p className="text-xs text-slate-500">
                          {topic.attempts} responses
                          {topic.subtopic ? ` · ${topic.subtopic}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {Math.round(topic.accuracy)}%
                      </p>
                    </div>
                    <div
                      aria-label={`${topic.topic} accuracy ${Math.round(topic.accuracy)}%`}
                      className="h-2 overflow-hidden rounded-full bg-slate-100"
                      role="img"
                    >
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.min(100, Math.max(0, topic.accuracy))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Topic insights will appear after you answer questions in a practice
                session or test.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current study plan</CardTitle>
            <CardDescription>Pending tasks from your active plan.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.studyTasks.length ? (
              <div className="space-y-3">
                {data.studyTasks.map((task) => (
                  <div className="rounded-2xl border border-slate-200 p-4" key={task.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{task.title}</p>
                        {task.description ? (
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {task.description}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="subtle">{task.status.replaceAll("_", " ")}</Badge>
                    </div>
                    {task.topic || task.targetCount ? (
                      <p className="mt-3 text-xs font-medium text-slate-500">
                        {[task.topic, task.targetCount ? `${task.targetCount} questions` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-900">No active study plan</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Recommendations will become more specific as your performance history
                  grows.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
