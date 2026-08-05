"use client";

import {
  CheckCircle2,
  CircleOff,
  Pencil,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  questionLifecycleAction,
  reviewQuestionAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReviewQueueQuestion } from "@/lib/admin/schemas";

export function ReviewQueue({
  initialQuestions,
  isAdmin,
}: {
  initialQuestions: ReviewQueueQuestion[];
  isAdmin: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [statusFilter, setStatusFilter] = useState("all");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () =>
      questions.filter(
        (question) =>
          statusFilter === "all" ||
          question.verificationStatus === statusFilter ||
          question.publicationStatus === statusFilter,
      ),
    [questions, statusFilter],
  );

  const review = (
    questionId: string,
    decision: "approved" | "rejected" | "changes_requested",
  ) => {
    setMessage(null);
    startTransition(async () => {
      const response = await reviewQuestionAction({
        questionId,
        decision,
        comments: comments[questionId] ?? "",
      });
      if (response.error) {
        setMessage({ type: "error", text: response.error });
        return;
      }
      const status =
        decision === "approved"
          ? "approved"
          : decision === "rejected"
            ? "rejected"
            : "draft";
      setQuestions((current) =>
        current.map((question) =>
          question.id === questionId
            ? { ...question, verificationStatus: status }
            : question,
        ),
      );
      setMessage({ type: "success", text: "Review decision saved." });
    });
  };

  const lifecycle = (
    questionId: string,
    action: "submit_review" | "publish" | "retire",
  ) => {
    setMessage(null);
    startTransition(async () => {
      const response = await questionLifecycleAction({ questionId, action });
      if (response.error) {
        setMessage({ type: "error", text: response.error });
        return;
      }
      setQuestions((current) =>
        current.map((question) => {
          if (question.id !== questionId) return question;
          if (action === "submit_review") {
            return { ...question, verificationStatus: "under_review" };
          }
          return {
            ...question,
            publicationStatus: action === "publish" ? "published" : "retired",
          };
        }),
      );
      setMessage({ type: "success", text: "Question lifecycle updated." });
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm text-slate-600">
            {visible.length} of {questions.length} questions
          </p>
          <select
            aria-label="Filter review queue"
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
            <option value="published">Published</option>
          </select>
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

      {visible.map((question) => (
        <Card key={question.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{question.difficulty}</Badge>
                <Badge variant="subtle">
                  {question.verificationStatus.replace("_", " ")}
                </Badge>
                <Badge
                  variant={
                    question.publicationStatus === "published"
                      ? "success"
                      : "subtle"
                  }
                >
                  {question.publicationStatus}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Version {question.version}</p>
            </div>
            <CardTitle className="pt-3 text-xl leading-8">
              {question.questionText}
            </CardTitle>
            <p className="text-sm text-slate-500">
              {question.module.replace("_", " ")} · {question.topic}
              {question.subtopic ? ` · ${question.subtopic}` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {question.passage ? (
              <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-7">
                {question.passage}
              </div>
            ) : null}
            {question.code ? (
              <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-slate-100">
                <code>{question.code}</code>
              </pre>
            ) : null}
            {question.formula ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-center font-serif text-lg">
                {question.formula}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              {question.options.map((option) => (
                <div
                  className={
                    option.id === question.correctOptionId
                      ? "rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm"
                      : "rounded-2xl border border-slate-200 p-4 text-sm"
                  }
                  key={option.id}
                >
                  <span className="mr-2 font-semibold">{option.label}.</span>
                  {option.content}
                  {option.id === question.correctOptionId ? (
                    <span className="ml-2 text-xs font-semibold text-emerald-700">
                      Correct
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold">Explanation</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {question.explanation}
              </p>
            </div>

            {question.verificationStatus === "under_review" ? (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <label className="block space-y-2 text-sm font-semibold">
                  Reviewer comments
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-slate-300 p-4 font-normal"
                    maxLength={2000}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    placeholder="Record validation notes or requested changes."
                    value={comments[question.id] ?? ""}
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={pending}
                    onClick={() => review(question.id, "approved")}
                    size="sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => review(question.id, "changes_requested")}
                    size="sm"
                    variant="secondary"
                  >
                    <Send className="h-4 w-4" />
                    Request changes
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => review(question.id, "rejected")}
                    size="sm"
                    variant="outline"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}

            {isAdmin ? (
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                {(question.verificationStatus === "draft" ||
                  question.verificationStatus === "rejected") && (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={
                          `/admin/questions/${question.id}/edit` as Route
                        }
                      >
                        <Pencil className="h-4 w-4" />
                        Edit question
                      </Link>
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => lifecycle(question.id, "submit_review")}
                      size="sm"
                      variant="secondary"
                    >
                      <Send className="h-4 w-4" />
                      Submit for review
                    </Button>
                  </>
                )}
                {question.verificationStatus === "approved" &&
                question.publicationStatus !== "published" ? (
                  <Button
                    disabled={pending}
                    onClick={() => lifecycle(question.id, "publish")}
                    size="sm"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Publish
                  </Button>
                ) : null}
                {question.publicationStatus === "published" ? (
                  <Button
                    disabled={pending}
                    onClick={() => lifecycle(question.id, "retire")}
                    size="sm"
                    variant="outline"
                  >
                    <CircleOff className="h-4 w-4" />
                    Retire
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      {!visible.length ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-slate-600">
            No questions match this review status.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
