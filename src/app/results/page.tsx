import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ResultReview } from "@/components/results/result-review";
import { EmptyState } from "@/components/shared/empty-state";
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
import { formatStudyTime } from "@/lib/dashboard/recommendations";
import { getAttemptResult, getResultHistory } from "@/lib/results/data";
import { resultAttemptIdSchema } from "@/lib/results/schemas";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string }>;
}) {
  const user = await requireUser();
  const requestedAttempt = (await searchParams).attempt;
  const parsedAttempt = requestedAttempt
    ? resultAttemptIdSchema.safeParse(requestedAttempt)
    : null;
  let history = null;
  let result = null;
  let loadError: string | null = null;

  try {
    if (requestedAttempt) {
      if (!parsedAttempt?.success) {
        loadError = "The requested result identifier is invalid.";
      } else {
        result = await getAttemptResult(user.id, parsedAttempt.data);
        if (!result) loadError = "This completed attempt could not be found.";
      }
    } else {
      history = await getResultHistory(user.id);
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load your results.";
  }

  if (requestedAttempt) {
    return (
      <PageShell
        eyebrow="Attempt result"
        title={result?.testTitle ?? "Result unavailable"}
        description="Review your score, timing, topic performance, and every question after submission."
      >
        {loadError || !result ? (
          <>
            <ErrorState
              title="Result unavailable"
              description={loadError ?? "This result could not be loaded."}
            />
            <Button asChild variant="secondary">
              <Link href="/results">
                <ArrowLeft className="h-4 w-4" />
                Back to results
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/results">
                  <ArrowLeft className="h-4 w-4" />
                  All results
                </Link>
              </Button>
            </div>

            <Card className="overflow-hidden">
              <div className="grid bg-primary text-primary-foreground lg:grid-cols-[280px_1fr]">
                <div className="flex flex-col items-center justify-center border-primary-foreground/20 p-8 lg:border-r">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-80">
                    Overall accuracy
                  </p>
                  <p className="mt-3 text-6xl font-semibold">
                    {Math.round(result.accuracy)}%
                  </p>
                  <p className="mt-2 text-sm opacity-80">
                    {result.correctCount} of {result.questions.length} correct
                  </p>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Correct",
                      value: result.correctCount,
                      icon: CheckCircle2,
                    },
                    {
                      label: "Incorrect",
                      value: result.incorrectCount,
                      icon: XCircle,
                    },
                    {
                      label: "Unanswered",
                      value: result.unansweredCount,
                      icon: FileCheck2,
                    },
                    {
                      label: "Time",
                      value: formatStudyTime(result.totalTimeSeconds),
                      icon: Clock3,
                    },
                  ].map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div className="rounded-md border border-primary-foreground/20 bg-primary-muted p-4" key={metric.label}>
                        <Icon className="h-5 w-5 opacity-80" />
                        <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
                        <p className="mt-1 text-xs opacity-80">{metric.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">
                    {result.recommendation.title}
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">
                    {result.recommendation.description}
                  </p>
                </div>
                <Button asChild>
                  <Link href="/practice">Start focused practice</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <BreakdownCard
                title="Topic performance"
                description="Accuracy and average response time by topic."
                rows={result.topicBreakdown}
              />
              <BreakdownCard
                title="Difficulty performance"
                description="How your result changes across difficulty levels."
                rows={result.difficultyBreakdown}
              />
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Question review
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Correct answers are available because this attempt has been submitted.
                </p>
              </div>
              <ResultReview questions={result.questions} />
            </div>
          </>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Results"
      title="Completed attempts"
      description="Open any submitted practice session or mock test to review its score, timing, explanations, and performance breakdowns."
    >
      {loadError || !history ? (
        <ErrorState
          title="Results unavailable"
          description={loadError ?? "Unable to load your result history."}
        />
      ) : history.length === 0 ? (
        <EmptyState
          title="No completed attempts yet"
          description="Complete a practice session or mock test and its detailed result will appear here."
        />
      ) : (
        <div className="space-y-4">
          {history.map((attempt) => (
            <Card key={attempt.id}>
              <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">
                      {attempt.testTitle}
                    </p>
                    <Badge
                      variant={
                        attempt.status === "auto_submitted" ? "warning" : "success"
                      }
                    >
                      {attempt.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {dateFormatter.format(
                      new Date(attempt.submittedAt ?? attempt.startedAt),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Accuracy</p>
                  <p className="mt-1 font-semibold">
                    {Math.round(attempt.accuracy)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Study time</p>
                  <p className="mt-1 font-semibold">
                    {formatStudyTime(attempt.totalTimeSeconds)}
                  </p>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/results?attempt=${attempt.id}` as Route}>
                    Review
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function BreakdownCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{
    label: string;
    accuracy: number;
    correct: number;
    total: number;
    averageTimeSeconds: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="space-y-5">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-semibold capitalize text-slate-900">
                      {row.label.replace("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.correct}/{row.total} correct ·{" "}
                      {Math.round(row.averageTimeSeconds)}s average
                    </p>
                  </div>
                  <p className="font-semibold">{Math.round(row.accuracy)}%</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${Math.min(100, Math.max(0, row.accuracy))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No breakdown data is available.</p>
        )}
      </CardContent>
    </Card>
  );
}
