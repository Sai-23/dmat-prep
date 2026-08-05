"use client";

import type { Route } from "next";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  completePracticeAction,
  startPracticeAction,
  submitPracticeAnswerAction,
} from "@/app/practice/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  PracticeConfig,
  PracticeFilters,
  PracticeQuestion,
} from "@/lib/practice/schemas";
import { formatStudyTime } from "@/lib/dashboard/recommendations";

type Session = {
  attemptId: string;
  expiresAt: string | null;
  questions: PracticeQuestion[];
  requestedQuantity: number;
};

type Feedback = {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string;
};

type Result = {
  correct: number;
  total: number;
  accuracy: number;
  totalTimeSeconds: number;
};

const questionTypeLabels: Record<string, string> = {
  any: "All question types",
  figure_sequence: "Figure sequence",
  mathematical_equation: "Mathematical equation",
  latin_square: "Latin square",
  computer_science: "Computer Science",
};

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function PracticeExperience({
  filters,
  initialConfig,
}: {
  filters: PracticeFilters;
  initialConfig?: Partial<PracticeConfig>;
}) {
  const [config, setConfig] = useState<PracticeConfig>({
    module: initialConfig?.module ?? "computer_science",
    questionType: initialConfig?.questionType ?? "any",
    topic: initialConfig?.topic,
    difficulty: initialConfig?.difficulty ?? "any",
    sourceType: initialConfig?.sourceType ?? "any",
    quantity: initialConfig?.questionId ? 1 : (initialConfig?.quantity ?? 10),
    timingMode: initialConfig?.timingMode ?? "untimed",
    questionId: initialConfig?.questionId,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const questionStartedAt = useRef(0);
  const completingRef = useRef(false);

  const topics = filters.topicsByModule[config.module];
  const question = session?.questions[questionIndex] ?? null;
  const progress = session
    ? ((questionIndex + (feedback ? 1 : 0)) / session.questions.length) * 100
    : 0;

  const completeSession = (activeSession = session) => {
    if (!activeSession || completingRef.current) return;
    completingRef.current = true;
    setError(null);

    startTransition(async () => {
      const response = await completePracticeAction({
        attemptId: activeSession.attemptId,
      });
      if (!("correct" in response)) {
        setError(response.error);
        completingRef.current = false;
        return;
      }

      setResult({
        correct: response.correct,
        total: response.total || activeSession.questions.length,
        accuracy: response.accuracy,
        totalTimeSeconds: response.totalTimeSeconds,
      });
    });
  };

  useEffect(() => {
    if (!session?.expiresAt || result) return;

    const updateRemaining = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (new Date(session.expiresAt as string).getTime() - Date.now()) / 1000,
        ),
      );
      setRemainingSeconds(seconds);
      if (seconds === 0) completeSession(session);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
    // The attempt identity is the only timer dependency; completion is guarded by a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.attemptId, session?.expiresAt, result]);

  const questionTypeOptions = useMemo(
    () =>
      config.module === "core"
        ? ["any", "figure_sequence", "mathematical_equation", "latin_square"]
        : ["any", "computer_science"],
    [config.module],
  );

  const startSession = () => {
    setError(null);
    setResult(null);
    completingRef.current = false;

    startTransition(async () => {
      const response = await startPracticeAction(config);
      if (
        !("attemptId" in response) ||
        !response.attemptId ||
        !response.questions ||
        response.requestedQuantity === undefined
      ) {
        setError(response.error ?? "Unable to start practice.");
        return;
      }

      setSession({
        attemptId: response.attemptId,
        expiresAt: response.expiresAt,
        questions: response.questions,
        requestedQuantity: response.requestedQuantity,
      });
      setQuestionIndex(0);
      setSelectedOptionId(null);
      setFeedback(null);
      setRemainingSeconds(
        response.expiresAt
          ? Math.max(
              0,
              Math.ceil(
                (new Date(response.expiresAt).getTime() - Date.now()) / 1000,
              ),
            )
          : null,
      );
      questionStartedAt.current = Date.now();
    });
  };

  const submitAnswer = () => {
    if (!session || !question || !selectedOptionId) return;
    setError(null);

    startTransition(async () => {
      const response = await submitPracticeAnswerAction({
        attemptId: session.attemptId,
        questionId: question.id,
        optionId: selectedOptionId,
        timeSpentSeconds: Math.max(
          0,
          Math.round((Date.now() - questionStartedAt.current) / 1000),
        ),
      });

      if (!("isCorrect" in response)) {
        setError(response.error ?? "Unable to save this answer.");
        return;
      }

      setFeedback({
        isCorrect: response.isCorrect,
        correctOptionId: response.correctOptionId ?? "",
        explanation: response.explanation ?? "",
      });
    });
  };

  const advance = () => {
    if (!session) return;
    if (questionIndex === session.questions.length - 1) {
      completeSession();
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedOptionId(null);
    setFeedback(null);
    setError(null);
    questionStartedAt.current = Date.now();
  };

  const restart = () => {
    setSession(null);
    setResult(null);
    setFeedback(null);
    setSelectedOptionId(null);
    setRemainingSeconds(null);
    setError(null);
    completingRef.current = false;
  };

  if (result && session) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-primary px-6 py-10 text-center text-primary-foreground">
          <CheckCircle2 className="mx-auto h-12 w-12" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] opacity-80">
            Practice complete
          </p>
          <p className="mt-2 text-5xl font-semibold">{Math.round(result.accuracy)}%</p>
          <p className="mt-2 opacity-80">
            {result.correct} of {result.total} questions correct
          </p>
        </div>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">Correct</p>
              <p className="mt-1 text-2xl font-semibold">{result.correct}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">Questions</p>
              <p className="mt-1 text-2xl font-semibold">{result.total}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">Study time</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatStudyTime(result.totalTimeSeconds)}
              </p>
            </div>
          </div>
          <p className="text-center text-sm leading-6 text-slate-600">
            Your dashboard metrics and topic performance have been updated.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={restart} variant="secondary">
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Configure another session
            </Button>
            <Button asChild>
              <Link href={`/results?attempt=${session.attemptId}` as Route}>
                Review answers
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (session && question) {
    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Question {questionIndex + 1} of {session.questions.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {question.topic}
                  {question.subtopic ? ` · ${question.subtopic}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="subtle">{question.difficulty}</Badge>
                {remainingSeconds !== null ? (
                  <span
                    className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800"
                    aria-live="polite"
                  >
                    <Clock3 aria-hidden="true" className="h-4 w-4" />
                    {formatTimer(remainingSeconds)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge>{questionTypeLabels[question.questionType]}</Badge>
              <Badge variant="subtle">{question.module.replace("_", " ")}</Badge>
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
            {question.imageUrl ? (
              <a
                className="inline-flex text-sm font-semibold text-blue-700 hover:underline"
                href={question.imageUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open supporting question image
              </a>
            ) : null}

            <div className="grid gap-3">
              {question.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                const isCorrect = feedback?.correctOptionId === option.id;
                const isIncorrectSelection = Boolean(
                  feedback && isSelected && !feedback.isCorrect,
                );

                return (
                  <button
                    className={[
                      "flex min-h-16 w-full items-center gap-4 rounded-md border p-4 text-left transition-colors",
                      isCorrect
                        ? "border-success bg-success-container text-success-container-foreground"
                        : isIncorrectSelection
                          ? "border-error bg-error-container text-error-container-foreground"
                          : isSelected
                            ? "border-primary bg-primary-muted ring-2 ring-primary-muted"
                            : "border-workspace-border bg-surface-lowest hover:border-primary hover:bg-surface-low",
                    ].join(" ")}
                    disabled={Boolean(feedback) || isPending}
                    key={option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    type="button"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current font-semibold">
                      {option.label}
                    </span>
                    <span className="flex-1 text-sm leading-6 text-on-surface">
                      {option.content}
                    </span>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Correct answer
                      </span>
                    ) : isIncorrectSelection ? (
                      <span className="flex items-center gap-1 text-xs font-semibold">
                        <XCircle className="h-4 w-4" />
                        Your answer
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {feedback ? (
              <div
                className={
                  feedback.isCorrect
                    ? "rounded-md border border-success bg-success-container p-5 text-success-container-foreground"
                    : "rounded-md border border-error bg-error-container p-5 text-error-container-foreground"
                }
                role="status"
              >
                <div className="flex items-center gap-2 font-semibold">
                  {feedback.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-error" />
                  )}
                  {feedback.isCorrect ? "Correct" : "Not quite"}
                </div>
                <p className="mt-3 text-sm leading-7">
                  {feedback.explanation}
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-workspace-separator pt-5 sm:flex-row sm:justify-between">
              <Button disabled={isPending} onClick={() => completeSession()} variant="ghost">
                Finish session
              </Button>
              {feedback ? (
                <Button disabled={isPending} onClick={advance}>
                  {questionIndex === session.questions.length - 1
                    ? "Complete practice"
                    : "Next question"}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  disabled={!selectedOptionId || isPending}
                  onClick={submitAnswer}
                >
                  {isPending ? "Checking..." : "Check answer"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build your practice session</CardTitle>
        <CardDescription>
          Choose a focused set. You will receive an explanation after every answer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {config.questionId ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            Exact-question reattempt is active. Complete this one question to check
            whether you have corrected the mistake.
          </div>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-800">
            Module
            <select
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
              disabled={Boolean(config.questionId)}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  module: event.target.value as PracticeConfig["module"],
                  topic: undefined,
                  questionType: "any",
                }))
              }
              value={config.module}
            >
              <option value="computer_science">Computer Science</option>
              <option value="core">Core Module</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-800">
            Question type
            <select
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
              disabled={Boolean(config.questionId)}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  questionType: event.target
                    .value as PracticeConfig["questionType"],
                }))
              }
              value={config.questionType}
            >
              {questionTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {questionTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-800">
            Topic
            <select
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
              disabled={Boolean(config.questionId)}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  topic: event.target.value || undefined,
                }))
              }
              value={config.topic ?? ""}
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-800">
            Difficulty
            <select
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
              disabled={Boolean(config.questionId)}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  difficulty: event.target.value as PracticeConfig["difficulty"],
                }))
              }
              value={config.difficulty}
            >
              <option value="any">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-800">
            Question source
            <select
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
              disabled={Boolean(config.questionId)}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  sourceType: event.target.value as PracticeConfig["sourceType"],
                }))
              }
              value={config.sourceType}
            >
              <option value="any">All sources</option>
              <option value="manual">Manually authored</option>
              <option value="generated">Generated and reviewed</option>
              <option value="imported">Imported</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-800">
            Number of questions
            <select
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
              disabled={Boolean(config.questionId)}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  quantity: Number(event.target.value),
                }))
              }
              value={config.quantity}
            >
              {config.questionId ? <option value={1}>1 question</option> : null}
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
              <option value={20}>20 questions</option>
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Timing mode</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              {
                value: "untimed",
                title: "Untimed learning",
                description: "Work without a countdown and focus on explanations.",
              },
              {
                value: "timed",
                title: "Timed practice",
                description: "Use the combined estimated time for the selected set.",
              },
            ].map((mode) => (
              <label
                className={[
                  "cursor-pointer rounded-2xl border p-4",
                  config.timingMode === mode.value
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200",
                ].join(" ")}
                key={mode.value}
              >
                <input
                  checked={config.timingMode === mode.value}
                  className="sr-only"
                  name="timingMode"
                  onChange={() =>
                    setConfig((current) => ({
                      ...current,
                      timingMode: mode.value as PracticeConfig["timingMode"],
                    }))
                  }
                  type="radio"
                />
                <span className="font-semibold text-slate-900">{mode.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  {mode.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Only approved and published questions are included.
          </p>
          <Button disabled={isPending} onClick={startSession}>
            {isPending ? "Preparing session..." : "Start practice"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
