"use client";

import type { Route } from "next";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  RotateCcw,
  Save,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  saveMistakeEntryAction,
  toggleBookmarkAction,
} from "@/app/learning/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MistakeQuestion } from "@/lib/learning/schemas";

type EntryState = {
  note: string;
  isUnderstood: boolean;
  isBookmarked: boolean;
};

export function MistakeNotebook({
  mistakes,
}: {
  mistakes: MistakeQuestion[];
}) {
  const [states, setStates] = useState<Record<string, EntryState>>(() =>
    Object.fromEntries(
      mistakes.map((mistake) => [
        mistake.id,
        {
          note: mistake.note,
          isUnderstood: mistake.isUnderstood,
          isBookmarked: mistake.isBookmarked,
        },
      ]),
    ),
  );
  const [filter, setFilter] = useState<"active" | "understood" | "all">("active");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return mistakes.filter((mistake) => {
      const state = states[mistake.id];
      const matchesState =
        filter === "all" ||
        (filter === "understood" && state?.isUnderstood) ||
        (filter === "active" && !state?.isUnderstood);
      const matchesQuery =
        !normalized ||
        mistake.questionText.toLowerCase().includes(normalized) ||
        mistake.topic.toLowerCase().includes(normalized);
      return matchesState && matchesQuery;
    });
  }, [filter, mistakes, query, states]);

  const saveEntry = (questionId: string, nextUnderstood?: boolean) => {
    const state = states[questionId];
    if (!state) return;
    const isUnderstood = nextUnderstood ?? state.isUnderstood;
    setMessage(null);

    startTransition(async () => {
      const response = await saveMistakeEntryAction({
        questionId,
        note: state.note,
        isUnderstood,
      });
      if (response.error) {
        setMessage({ type: "error", text: response.error });
        return;
      }
      setStates((current) => ({
        ...current,
        [questionId]: { ...current[questionId], isUnderstood },
      }));
      setMessage({ type: "success", text: "Notebook entry saved." });
    });
  };

  const toggleBookmark = (questionId: string) => {
    const state = states[questionId];
    if (!state) return;
    const nextValue = !state.isBookmarked;
    setMessage(null);

    startTransition(async () => {
      const response = await toggleBookmarkAction({
        questionId,
        bookmarked: nextValue,
      });
      if (response.error) {
        setMessage({ type: "error", text: response.error });
        return;
      }
      setStates((current) => ({
        ...current,
        [questionId]: {
          ...current[questionId],
          isBookmarked: nextValue,
        },
      }));
    });
  };

  const activeCount = mistakes.filter(
    (mistake) => !states[mistake.id]?.isUnderstood,
  ).length;
  const understoodCount = mistakes.length - activeCount;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Unique mistakes</p>
            <p className="mt-2 text-3xl font-semibold">{mistakes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Needs review</p>
            <p className="mt-2 text-3xl font-semibold text-red-700">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Understood</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">
              {understoodCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <label className="relative w-full md:max-w-md">
            <span className="sr-only">Search mistakes</span>
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search question or topic"
              type="search"
              value={query}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["active", "understood", "all"] as const).map((value) => (
              <button
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  filter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-slate-700",
                ].join(" ")}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {message ? (
        <p
          className={
            message.type === "success"
              ? "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
              : "rounded-xl bg-red-50 p-3 text-sm text-red-800"
          }
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}

      {visible.length ? (
        visible.map((mistake) => {
          const state = states[mistake.id];
          const selected = mistake.options.find(
            (option) => option.id === mistake.selectedOptionId,
          );
          const correct = mistake.options.find(
            (option) => option.id === mistake.correctOptionId,
          );
          const retryUrl =
            `/practice?question=${mistake.id}&module=${mistake.module}` as Route;

          return (
            <Card
              className={state?.isUnderstood ? "border-emerald-200" : "border-red-200"}
              key={mistake.id}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{mistake.difficulty}</Badge>
                    <Badge variant="subtle">{mistake.topic}</Badge>
                    <Badge variant="warning">
                      Incorrect {mistake.occurrenceCount}×
                    </Badge>
                  </div>
                  {state?.isUnderstood ? (
                    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                      Understood
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm font-semibold text-red-700">
                      <XCircle className="h-5 w-5" />
                      Needs review
                    </span>
                  )}
                </div>
                <CardTitle className="pt-2 text-xl leading-8">
                  {mistake.questionText}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Your latest answer
                    </p>
                    <p className="mt-2 text-sm text-slate-800">
                      {selected
                        ? `${selected.label}. ${selected.content}`
                        : "No option selected"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Correct answer
                    </p>
                    <p className="mt-2 text-sm text-slate-800">
                      {correct
                        ? `${correct.label}. ${correct.content}`
                        : "Answer unavailable"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="font-semibold">Explanation</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {mistake.explanation}
                  </p>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Personal note
                  </span>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    maxLength={2000}
                    onChange={(event) =>
                      setStates((current) => ({
                        ...current,
                        [mistake.id]: {
                          ...current[mistake.id],
                          note: event.target.value,
                        },
                      }))
                    }
                    placeholder="What caused the mistake? What should you remember next time?"
                    value={state?.note ?? ""}
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={pending}
                      onClick={() => saveEntry(mistake.id)}
                      size="sm"
                      variant="secondary"
                    >
                      <Save className="h-4 w-4" />
                      Save note
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() =>
                        saveEntry(mistake.id, !state?.isUnderstood)
                      }
                      size="sm"
                      variant={state?.isUnderstood ? "ghost" : "secondary"}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {state?.isUnderstood
                        ? "Mark as needs review"
                        : "Mark understood"}
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => toggleBookmark(mistake.id)}
                      size="sm"
                      variant="ghost"
                    >
                      {state?.isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {state?.isBookmarked ? "Bookmarked" : "Bookmark"}
                    </Button>
                  </div>
                  <Button asChild size="sm">
                    <Link href={retryUrl}>
                      <RotateCcw className="h-4 w-4" />
                      Reattempt question
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-slate-600">
            No mistake entries match this filter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
