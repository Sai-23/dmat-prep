"use client";

import {
  Clock3,
  Eye,
  EyeOff,
  FileQuestion,
  Layers3,
  Pencil,
  Plus,
  Send,
  Search,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { adminTestLifecycleAction } from "@/app/admin/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminTestListItem } from "@/lib/admin/test-schemas";

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`
    : `${minutes} min`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function difficultySummary(test: AdminTestListItem) {
  const questions = test.sections.flatMap((section) => section.questions);
  const count = (difficulty: string) => questions.filter((question) => question.difficulty === difficulty).length;
  return `Easy ${count("easy")} · Medium ${count("medium")} · Hard ${count("hard")}`;
}

export function TestManager({
  initialTests,
}: {
  initialTests: AdminTestListItem[];
}) {
  const [tests, setTests] = useState(initialTests);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState<AdminTestListItem | null>(null);
  const [pending, startTransition] = useTransition();
  const visibleTests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tests.filter((test) =>
      (status === "all" || (status === "published") === test.isPublished) &&
      (!term || test.title.toLowerCase().includes(term)),
    );
  }, [search, status, tests]);

  const lifecycle = (testId: string, action: "publish" | "unpublish") => {
    setMessage(null);
    startTransition(async () => {
      const response = await adminTestLifecycleAction({ testId, action });
      if (response.error) {
        setMessage({ type: "error", text: response.error });
        return;
      }
      setTests((current) =>
        current.map((test) =>
          test.id === testId
            ? { ...test, isPublished: action === "publish" }
            : test,
        ),
      );
      setMessage({
        type: "success",
        text:
          action === "publish"
            ? "Mock published to the student catalog."
            : "Mock unpublished from the student catalog.",
      });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
            <span className="sr-only">Search created mocks</span>
            <input className="h-10 w-full rounded-md border border-input-border pl-10 pr-3 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Search created mocks" value={search} />
          </label>
          <select aria-label="Filter mocks by status" className="h-10 rounded-md border border-input-border bg-white px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <Button asChild>
          <Link href="/admin/tests/new">
            <Plus className="h-4 w-4" />
            Build Mock
          </Link>
        </Button>
      </div>

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

      <div className="grid gap-5 lg:grid-cols-2">
        {visibleTests.map((test) => (
          <Card className="flex flex-col" key={test.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge>{test.testType.replaceAll("_", " ")}</Badge>
                  <Badge variant={test.isPublished ? "success" : "subtle"}>
                    {test.isPublished ? "Published" : "Draft"}
                  </Badge>
                  {test.isPremium ? (
                    <Badge variant="warning">Premium</Badge>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">
                  {test.module?.replace("_", " ") ?? "Core assessment"}
                </span>
              </div>
              <CardTitle className="pt-3 text-xl">{test.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <Clock3 className="h-4 w-4 text-blue-700" />
                  <p className="mt-2 text-sm font-semibold">
                    {formatDuration(test.durationSeconds)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <Layers3 className="h-4 w-4 text-blue-700" />
                  <p className="mt-2 text-sm font-semibold">
                    {test.sectionCount} sections
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <FileQuestion className="h-4 w-4 text-blue-700" />
                  <p className="mt-2 text-sm font-semibold">
                    {test.questionCount} questions
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <Users className="h-4 w-4 text-blue-700" />
                  <p className="mt-2 text-sm font-semibold">
                    {test.attemptCount} attempts
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Created {formatDate(test.createdAt)} · Updated {formatDate(test.updatedAt)}
              </p>
              <p className="text-sm font-medium text-slate-600">{difficultySummary(test)}</p>

              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                <Button onClick={() => setPreview(test)} size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/admin/tests/${test.id}/edit` as Route}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Mock
                    </Link>
                  </Button>
                <Button
                  disabled={pending}
                  onClick={() =>
                    lifecycle(
                      test.id,
                      test.isPublished ? "unpublish" : "publish",
                    )
                  }
                  size="sm"
                  variant={test.isPublished ? "outline" : "default"}
                >
                  {test.isPublished ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {test.isPublished ? "Unpublish" : "Publish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!visibleTests.length ? (
        <EmptyState
          title={tests.length ? "No created mocks match these filters" : "No mocks have been created"}
          description={tests.length ? "Change the search or status filter." : "Use Build Mock to configure the first mock from approved, published questions."}
        />
      ) : null}
      <Dialog onOpenChange={(open) => { if (!open) setPreview(null); }} open={Boolean(preview)} title={preview?.title ?? "Mock preview"}>
        {preview ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><Badge>{preview.isPublished ? "Published" : "Draft"}</Badge><Badge variant="subtle">{preview.questionCount} questions</Badge><Badge variant="subtle">{formatDuration(preview.durationSeconds)}</Badge></div>
            {preview.sections.map((section, sectionIndex) => (
              <div className="rounded-xl border border-slate-200 p-4" key={`${section.title}-${sectionIndex}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{sectionIndex + 1}. {section.title}</p><span className="text-xs text-slate-500">{section.questions.length} questions · {formatDuration(section.durationSeconds)}</span></div>
                <div className="mt-3 space-y-2">
                  {section.questions.map((question, questionIndex) => (
                    <div className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm" key={`${question.id}-${questionIndex}`}>
                      <span className="font-semibold">{questionIndex + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate">{question.questionText}</span><span className="mt-1 block text-xs capitalize text-slate-500">{question.questionType.replaceAll("_", " ")} · {question.difficulty}{question.unavailable ? " · Unavailable / Deleted" : ""}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end"><Button asChild><Link href={`/admin/tests/${preview.id}/edit` as Route}><Pencil className="h-4 w-4" />Edit Mock</Link></Button></div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
