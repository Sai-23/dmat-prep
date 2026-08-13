"use client";

import {
  CheckCircle2,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  deleteQuestionAction,
  reviewQuestionAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReviewQueueQuestion } from "@/lib/admin/schemas";
import { GeneratedBankPreview } from "./generated-bank-preview";

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function generationMetadata(question: ReviewQueueQuestion): Record<string, unknown> {
  return objectValue(objectValue(question.metadata)?.generation) ?? {};
}

export function ReviewQueue({
  initialQuestions,
  isAdmin,
}: {
  initialQuestions: ReviewQueueQuestion[];
  isAdmin: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState(isAdmin ? "published" : "all");
  const [generatorFilter, setGeneratorFilter] = useState("");
  const [validatorFilter, setValidatorFilter] = useState("");
  const [seedFilter, setSeedFilter] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [search, setSearch] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReviewQueueQuestion | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () =>
      questions.filter((question) => {
        const generation = generationMetadata(question);
        const searchable = `${question.id} ${question.questionText} ${question.topic} ${question.subtopic ?? ""}`.toLowerCase();
        return (
          (statusFilter === "all" || question.verificationStatus === statusFilter) &&
          (publicationFilter === "all" || question.publicationStatus === publicationFilter) &&
          (moduleFilter === "all" || question.module === moduleFilter) &&
          (typeFilter === "all" || question.questionType === typeFilter) &&
          (difficultyFilter === "all" || question.difficulty === difficultyFilter) &&
          (sourceFilter === "all" || question.sourceType === sourceFilter) &&
          (!generatorFilter || String(generation.generatorVersion ?? "").toLowerCase().includes(generatorFilter.toLowerCase())) &&
          (!validatorFilter || String(generation.validatorVersion ?? "").toLowerCase().includes(validatorFilter.toLowerCase())) &&
          (!seedFilter || String(generation.seed ?? "").toLowerCase().includes(seedFilter.toLowerCase())) &&
          (!createdAfter || question.createdAt.slice(0, 10) >= createdAfter) &&
          (!search || searchable.includes(search.toLowerCase()))
        );
      }),
    [questions, statusFilter, publicationFilter, moduleFilter, typeFilter, difficultyFilter, sourceFilter, generatorFilter, validatorFilter, seedFilter, createdAfter, search],
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

  const removeQuestion = () => {
    if (!deleteTarget) return;
    const questionId = deleteTarget.id;
    setMessage(null);
    startTransition(async () => {
      const response = await deleteQuestionAction({ questionId });
      if (response.error) {
        setMessage({ type: "error", text: response.error });
        return;
      }
      setQuestions((current) => current.filter((question) => question.id !== questionId));
      setDeleteTarget(null);
      setMessage({
        type: "success",
        text: response.message ?? "Question removed from the active bank.",
      });
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <input aria-label="Search question bank" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Search text or ID" value={search} />
            <select aria-label="Filter module" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setModuleFilter(event.target.value)} value={moduleFilter}><option value="all">All modules</option><option value="core">Core</option></select>
            <select aria-label="Filter question type" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="all">All types</option><option value="mathematical_equation">Equations</option><option value="latin_square">Latin squares</option><option value="figure_sequence">Figure sequences</option></select>
            <select aria-label="Filter difficulty" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setDifficultyFilter(event.target.value)} value={difficultyFilter}><option value="all">All difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
            <select aria-label="Filter source" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setSourceFilter(event.target.value)} value={sourceFilter}><option value="all">All sources</option><option value="generated">Generated</option><option value="manual">Manual</option><option value="imported">Imported</option></select>
            <input aria-label="Filter generator version" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setGeneratorFilter(event.target.value)} placeholder="Generator version" value={generatorFilter} />
            <input aria-label="Filter validator version" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setValidatorFilter(event.target.value)} placeholder="Validator version" value={validatorFilter} />
            <input aria-label="Filter seed" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setSeedFilter(event.target.value)} placeholder="Seed" value={seedFilter} />
            <input aria-label="Created on or after" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setCreatedAfter(event.target.value)} type="date" value={createdAfter} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            {visible.length} of {questions.length} questions
          </p>
          {!isAdmin ? <select
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
          </select> : null}
          <select aria-label="Filter publication status" className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm" onChange={(event) => setPublicationFilter(event.target.value)} value={publicationFilter}><option value="all">All publication states</option><option value="draft">Unpublished</option><option value="published">Published</option><option value="retired">Retired</option><option value="flagged">Flagged</option></select>
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

      {visible.map((question) => (
        <Card key={question.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{question.difficulty}</Badge>
                {!isAdmin ? <Badge variant="subtle">
                  {question.verificationStatus.replace("_", " ")}
                </Badge> : null}
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
            {question.sourceType === "generated" ? (
              <GeneratedBankPreview questionType={question.questionType} structuredData={question.structuredData} />
            ) : null}
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

            {question.sourceType === "generated" ? (() => {
              const generation = generationMetadata(question);
              const metadata = objectValue(question.metadata);
              const validation = objectValue(metadata?.validation);
              return (
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2 lg:grid-cols-4">
                  {["seed", "generatorVersion", "validatorVersion", "fingerprint", "requestedDifficulty", "calculatedDifficulty"].map((key) => (
                    <div key={key}><p className="text-xs font-semibold uppercase text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 break-all font-mono text-xs">{String(generation[key] ?? "—")}</p></div>
                  ))}
                  <div><p className="text-xs font-semibold uppercase text-slate-500">Validation</p><p className="mt-1 text-sm font-semibold">{validation?.valid === true ? "Passed" : "Not verified"}</p></div>
                  <div><p className="text-xs font-semibold uppercase text-slate-500">Verified answer</p><pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(metadata?.correctAnswer ?? "Stored in structured child questions", null, 2)}</pre></div>
                </div>
              );
            })() : null}

            {!isAdmin && question.verificationStatus === "under_review" ? (
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
                {question.sourceType !== "generated" && (question.verificationStatus === "draft" ||
                  question.verificationStatus === "rejected" ||
                  question.publicationStatus === "published") && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/admin/questions/${question.id}/edit` as Route}
                    >
                      <Pencil className="h-4 w-4" />
                      {question.publicationStatus === "published"
                        ? "Correct published question"
                        : "Edit question"}
                    </Link>
                  </Button>
                )}
                <Button
                  disabled={pending}
                  onClick={() => setDeleteTarget(question)}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete question
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      {!visible.length ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-slate-600">
            No questions match the current filters.
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        onOpenChange={(open) => { if (!open && !pending) setDeleteTarget(null); }}
        open={Boolean(deleteTarget)}
        title="Delete this question?"
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-on-surface-variant">
            This removes it from the active question bank and from all new Practice and Mock selections. Existing attempts remain available through their immutable snapshots.
          </p>
          <div className="flex justify-end gap-3">
            <Button disabled={pending} onClick={() => setDeleteTarget(null)} variant="outline">Cancel</Button>
            <Button disabled={pending} onClick={removeQuestion} variant="destructive">
              <Trash2 className="h-4 w-4" />
              {pending ? "Deleting…" : "Delete question"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
