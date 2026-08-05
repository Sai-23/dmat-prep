"use client";

import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  saveTestResponseAction,
  submitTestAction,
} from "@/app/tests/actions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatStudyTime } from "@/lib/dashboard/recommendations";
import type { TestAttemptPayload } from "@/lib/tests/schemas";

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

type TestResult = {
  correct: number;
  total: number;
  accuracy: number;
  totalTimeSeconds: number;
};

export function TestRunner({ attempt }: { attempt: TestAttemptPayload }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(
      attempt.initialResponses.map((response) => [
        response.questionId,
        response.selectedOptionId,
      ]),
    ),
  );
  const [marked, setMarked] = useState<Set<string>>(
    () =>
      new Set(
        attempt.initialResponses
          .filter((response) => response.markedForReview)
          .map((response) => response.questionId),
      ),
  );
  const initialTimes = useRef(
    new Map(
      attempt.initialResponses.map((response) => [
        response.questionId,
        response.timeSpentSeconds,
      ]),
    ),
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [pending, startTransition] = useTransition();
  const questionStartedAt = useRef(0);
  const submittingRef = useRef(false);
  const question = attempt.questions[questionIndex];

  const submitTest = (autoSubmitted = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);

    startTransition(async () => {
      if (!autoSubmitted) {
        const timeSpentSeconds =
          Number(initialTimes.current.get(question.id) ?? 0) +
          Math.max(
            0,
            Math.round((Date.now() - questionStartedAt.current) / 1000),
          );
        const saveResponse = await saveTestResponseAction({
          attemptId: attempt.attemptId,
          questionId: question.id,
          selectedOptionId: answers[question.id] ?? null,
          markedForReview: marked.has(question.id),
          timeSpentSeconds,
        });

        if (saveResponse.error) {
          setError(saveResponse.error);
          submittingRef.current = false;
          return;
        }
      }

      const response = await submitTestAction({
        attemptId: attempt.attemptId,
        autoSubmitted,
      });

      if (!("correct" in response)) {
        setError(response.error);
        submittingRef.current = false;
        return;
      }

      setResult({
        correct: response.correct,
        total: response.total || attempt.questions.length,
        accuracy: response.accuracy,
        totalTimeSeconds: response.totalTimeSeconds,
      });
    });
  };

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [questionIndex]);

  useEffect(() => {
    if (result) return;

    const updateRemaining = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
      if (seconds === 0) submitTest(true);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
    // Submission is guarded by a ref and the attempt expiry is immutable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.expiresAt, result]);

  const persistResponse = (
    selectedOptionId: string | null,
    markedForReview: boolean,
    onSaved?: () => void,
  ) => {
    setError(null);
    startTransition(async () => {
      const timeSpentSeconds =
        Number(initialTimes.current.get(question.id) ?? 0) +
        Math.max(
          0,
          Math.round((Date.now() - questionStartedAt.current) / 1000),
        );
      const response = await saveTestResponseAction({
        attemptId: attempt.attemptId,
        questionId: question.id,
        selectedOptionId,
        markedForReview,
        timeSpentSeconds,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      initialTimes.current.set(question.id, timeSpentSeconds);
      questionStartedAt.current = Date.now();
      setAnswers((current) => ({ ...current, [question.id]: selectedOptionId }));
      setMarked((current) => {
        const next = new Set(current);
        if (markedForReview) next.add(question.id);
        else next.delete(question.id);
        return next;
      });
      onSaved?.();
    });
  };

  const navigate = (nextIndex: number) => {
    persistResponse(answers[question.id] ?? null, marked.has(question.id), () => {
      setQuestionIndex(nextIndex);
    });
  };

  const answeredCount = Object.values(answers).filter(Boolean).length;

  if (result) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <Card className="overflow-hidden">
          <div className="bg-primary p-10 text-center text-primary-foreground">
            <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] opacity-80">
              Test submitted
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{attempt.title}</h1>
            <p className="mt-5 text-5xl font-semibold">{Math.round(result.accuracy)}%</p>
            <p className="mt-2 opacity-80">
              {result.correct} of {result.total} correct
            </p>
          </div>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Answered</p>
                <p className="mt-1 text-2xl font-semibold">{answeredCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Accuracy</p>
                <p className="mt-1 text-2xl font-semibold">
                  {Math.round(result.accuracy)}%
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Recorded time</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatStudyTime(result.totalTimeSeconds)}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="secondary">
                <Link href="/tests">Back to tests</Link>
              </Button>
              <Button asChild>
                <Link href={`/results?attempt=${attempt.attemptId}` as Route}>
                  Review answers
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-workspace-border bg-surface-lowest p-4">
        <div>
          <p className="font-semibold text-on-surface">{attempt.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {question.sectionTitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-on-surface-variant">
            {answeredCount}/{attempt.questions.length} answered
          </span>
          <span
            className="flex items-center gap-2 rounded-md border border-workspace-border bg-code-background px-4 py-2 font-mono text-sm font-semibold text-code-foreground"
            aria-live="polite"
          >
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            {remainingSeconds === null ? "--:--" : formatTimer(remainingSeconds)}
          </span>
          <ThemeToggle compact />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="subtle">
                Question {questionIndex + 1} of {attempt.questions.length}
              </Badge>
              <Badge>{question.difficulty}</Badge>
            </div>
            <CardTitle className="pt-3 text-2xl leading-9">
              {question.questionText}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {question.passage ? (
              <div className="rounded-md border-l-4 border-primary bg-primary-muted p-5 text-sm leading-7 text-on-surface">
                {question.passage}
              </div>
            ) : null}
            {question.code ? (
              <pre className="overflow-x-auto rounded-md bg-code-background p-5 text-sm leading-6 text-code-foreground">
                <code>{question.code}</code>
              </pre>
            ) : null}
            {question.formula ? (
              <div className="rounded-md border border-workspace-border bg-code-background p-5 text-center font-mono text-xl text-code-foreground">
                {question.formula}
              </div>
            ) : null}
            {question.tableData ? (
              <pre className="overflow-x-auto rounded-md bg-code-background p-4 text-sm">
                {JSON.stringify(question.tableData, null, 2)}
              </pre>
            ) : null}

            <div className="grid gap-3">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <button
                    className={[
                      "flex min-h-16 w-full items-center gap-4 rounded-md border p-4 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary-muted ring-2 ring-primary-muted"
                        : "border-workspace-border bg-surface-lowest hover:border-primary hover:bg-surface-low",
                    ].join(" ")}
                    disabled={pending}
                    key={option.id}
                    onClick={() =>
                      persistResponse(option.id, marked.has(question.id))
                    }
                    type="button"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current font-semibold">
                      {option.label}
                    </span>
                    <span className="text-sm leading-6 text-on-surface">
                      {option.content}
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? (
              <p className="rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-workspace-separator pt-5">
              <Button
                disabled={pending}
                onClick={() =>
                  persistResponse(
                    answers[question.id] ?? null,
                    !marked.has(question.id),
                  )
                }
                variant={marked.has(question.id) ? "secondary" : "ghost"}
              >
                <BookmarkCheck aria-hidden="true" className="h-4 w-4" />
                {marked.has(question.id) ? "Marked for review" : "Mark for review"}
              </Button>
              <div className="flex gap-2">
                <Button
                  disabled={questionIndex === 0 || pending}
                  onClick={() => navigate(questionIndex - 1)}
                  variant="secondary"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  disabled={
                    questionIndex === attempt.questions.length - 1 || pending
                  }
                  onClick={() => navigate(questionIndex + 1)}
                >
                  Next
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Question navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {attempt.questions.map((item, index) => {
                  const isCurrent = index === questionIndex;
                  const isAnswered = Boolean(answers[item.id]);
                  const isMarked = marked.has(item.id);
                  return (
                    <button
                      aria-label={`Question ${index + 1}${isAnswered ? ", answered" : ""}${isMarked ? ", marked for review" : ""}`}
                      className={[
                        "relative flex h-10 items-center justify-center rounded-md border text-sm font-semibold",
                        isCurrent
                          ? "border-primary bg-primary-muted text-on-surface ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : isAnswered
                            ? "border-success bg-success-container text-success-container-foreground"
                            : "border-workspace-border bg-surface-container text-on-surface-variant",
                      ].join(" ")}
                      disabled={pending}
                      key={item.id}
                      onClick={() => navigate(index)}
                      type="button"
                    >
                      {index + 1}
                      {isMarked ? (
                        <BookmarkCheck
                          aria-hidden="true"
                          className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-sm bg-warning-container text-warning"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 space-y-2 text-xs text-on-surface-variant">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Answered
                </p>
                <p className="flex items-center gap-2">
                  <BookmarkCheck className="h-3.5 w-3.5 text-warning" />
                  Marked for review
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm leading-6 text-on-surface-variant">
                Submit only when you are ready. Feedback is shown after the full test.
              </p>
              <Button
                className="w-full"
                disabled={pending}
                onClick={() => submitTest(false)}
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                {pending ? "Saving..." : "Submit test"}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
