"use client";

import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";

import { toggleBookmarkAction } from "@/app/learning/actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResultQuestion } from "@/lib/results/schemas";

type ReviewFilter = "all" | "correct" | "incorrect" | "unanswered" | "marked";

export function ResultReview({ questions }: { questions: ResultQuestion[] }) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [bookmarked, setBookmarked] = useState(
    () =>
      new Set(
        questions
          .filter((question) => question.isBookmarked)
          .map((question) => question.id),
      ),
  );
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [bookmarkPending, startBookmarkTransition] = useTransition();
  const counts: Record<ReviewFilter, number> = {
    all: questions.length,
    correct: questions.filter((question) => question.isCorrect).length,
    incorrect: questions.filter(
      (question) =>
        question.responseStatus === "answered" && !question.isCorrect,
    ).length,
    unanswered: questions.filter(
      (question) => question.responseStatus !== "answered",
    ).length,
    marked: questions.filter((question) => question.markedForReview).length,
  };
  const visibleQuestions = questions.filter((question) => {
    if (filter === "correct") return question.isCorrect;
    if (filter === "incorrect") {
      return question.responseStatus === "answered" && !question.isCorrect;
    }
    if (filter === "unanswered") return question.responseStatus !== "answered";
    if (filter === "marked") return question.markedForReview;
    return true;
  });

  const toggleBookmark = (questionId: string) => {
    const nextValue = !bookmarked.has(questionId);
    setBookmarkError(null);
    startBookmarkTransition(async () => {
      const response = await toggleBookmarkAction({
        questionId,
        bookmarked: nextValue,
      });
      if (response.error) {
        setBookmarkError(response.error);
        return;
      }
      setBookmarked((current) => {
        const next = new Set(current);
        if (nextValue) next.add(questionId);
        else next.delete(questionId);
        return next;
      });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Review filters">
        {(["all", "incorrect", "unanswered", "correct", "marked"] as const).map(
          (value) => (
            <button
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-lowest text-on-surface-variant ring-1 ring-workspace-border hover:bg-surface-low",
              ].join(" ")}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value.charAt(0).toUpperCase() + value.slice(1)} ({counts[value]})
            </button>
          ),
        )}
      </div>

      {bookmarkError ? (
        <p className="rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
          {bookmarkError}
        </p>
      ) : null}

      {visibleQuestions.length ? (
        visibleQuestions.map((question) => {
          const unanswered = question.responseStatus !== "answered";
          const selectedOption = question.options.find(
            (option) => option.id === question.selectedOptionId,
          );
          const correctOption = question.options.find(
            (option) => option.id === question.correctOptionId,
          );

          return (
            <Card
              className={
                question.isCorrect
                  ? "border-success"
                  : unanswered
                    ? "border-warning"
                    : "border-error"
              }
              key={question.id}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="subtle">{question.sectionTitle}</Badge>
                    <Badge>{question.difficulty}</Badge>
                    {question.markedForReview ? (
                      <Badge variant="warning">
                        <BookmarkCheck className="mr-1 h-3 w-3" />
                        Marked
                      </Badge>
                    ) : null}
                  </div>
                  <div
                    className={[
                      "flex items-center gap-2 text-sm font-semibold",
                      question.isCorrect
                        ? "text-success"
                        : unanswered
                          ? "text-warning"
                          : "text-error",
                    ].join(" ")}
                  >
                    {question.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : unanswered ? (
                      <MinusCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    {question.isCorrect
                      ? "Correct"
                      : unanswered
                        ? "Unanswered"
                        : "Incorrect"}
                  </div>
                </div>
                <div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-muted disabled:opacity-50"
                    disabled={bookmarkPending}
                    onClick={() => toggleBookmark(question.id)}
                    type="button"
                  >
                    {bookmarked.has(question.id) ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {bookmarked.has(question.id)
                      ? "Saved to bookmarks"
                      : "Save question"}
                  </button>
                </div>
                <CardTitle className="pt-3 text-xl leading-8">
                  {question.questionText}
                </CardTitle>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  {question.timeSpentSeconds}s · {question.topic}
                  {question.subtopic ? ` · ${question.subtopic}` : ""}
                </p>
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

                <div className="grid gap-3">
                  {question.options.map((option) => {
                    const isCorrectOption = option.id === question.correctOptionId;
                    const isSelected = option.id === question.selectedOptionId;
                    return (
                      <div
                        className={[
                          "flex min-h-14 items-center gap-3 rounded-md border p-4 text-sm",
                          isCorrectOption
                            ? "border-success bg-success-container text-success-container-foreground"
                            : isSelected
                              ? "border-error bg-error-container text-error-container-foreground"
                              : "border-workspace-border bg-surface-lowest",
                        ].join(" ")}
                        key={option.id}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current font-semibold">
                          {option.label}
                        </span>
                        <span className="flex-1">{option.content}</span>
                        {isCorrectOption ? (
                          <span className="flex items-center gap-1 text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            Correct answer
                          </span>
                        ) : isSelected ? (
                          <span className="flex items-center gap-1 text-xs font-semibold">
                            <XCircle className="h-4 w-4" />
                            Your answer
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-md bg-surface-low p-5">
                  <p className="font-semibold text-on-surface">Explanation</p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    {question.explanation}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Your response: {selectedOption?.label ?? "No answer"} · Correct:{" "}
                    {correctOption?.label ?? "Unavailable"}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-slate-600">
            No questions match this review filter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
