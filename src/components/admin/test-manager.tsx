"use client";

import {
  Clock3,
  EyeOff,
  FileQuestion,
  Layers3,
  Pencil,
  Plus,
  Send,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { adminTestLifecycleAction } from "@/app/admin/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [pending, startTransition] = useTransition();

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
            ? "Test published to the student catalog."
            : "Test unpublished from the student catalog.",
      });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/admin/tests/new">
            <Plus className="h-4 w-4" />
            Create test
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
        {tests.map((test) => (
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
                  {test.module?.replace("_", " ") ?? "mixed modules"}
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

              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                {!test.isPublished && test.attemptCount === 0 ? (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/admin/tests/${test.id}/edit` as Route}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                ) : null}
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
      {!tests.length ? (
        <EmptyState
          title="No assessments have been created"
          description="Use Create test to configure the first assessment from approved, published questions."
        />
      ) : null}
    </div>
  );
}
