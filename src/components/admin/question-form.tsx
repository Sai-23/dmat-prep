"use client";

import { CheckCircle2, Eye, Save, Send } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createQuestionAction,
  type QuestionFormState,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EditableQuestion } from "@/lib/admin/schemas";

const initialState: QuestionFormState = { status: "idle" };

function FieldError({
  errors,
}: {
  errors: string[] | undefined;
}) {
  return errors?.map((error) => (
    <p className="text-sm text-red-700" key={error}>
      {error}
    </p>
  ));
}

export function QuestionForm({
  initialQuestion,
}: {
  initialQuestion?: EditableQuestion;
}) {
  const [state, formAction, pending] = useActionState(
    createQuestionAction,
    initialState,
  );
  const [questionType, setQuestionType] = useState<string>(
    initialQuestion?.questionType ?? "computer_science",
  );
  const [module, setModule] = useState<string>(
    initialQuestion?.module ?? "computer_science",
  );
  const [questionText, setQuestionText] = useState(
    initialQuestion?.questionText ?? "",
  );
  const [options, setOptions] = useState(
    initialQuestion?.options ?? ["", "", "", ""],
  );
  const [correctOptionIndex, setCorrectOptionIndex] = useState(
    String(initialQuestion?.correctOptionIndex ?? 0),
  );

  const changeQuestionType = (value: string) => {
    setQuestionType(value);
    setModule(value === "computer_science" ? "computer_science" : "core");
  };

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      {initialQuestion ? (
        <input name="questionId" type="hidden" value={initialQuestion.id} />
      ) : null}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Question classification</CardTitle>
            <CardDescription>
              Choose the module, content type, topic, source, and difficulty.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              Question type
              <select
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                name="questionType"
                onChange={(event) => changeQuestionType(event.target.value)}
                value={questionType}
              >
                <option value="computer_science">Computer Science</option>
                <option value="mathematical_equation">Mathematical equation</option>
                <option value="figure_sequence">Figure sequence</option>
                <option value="latin_square">Latin square</option>
              </select>
              <FieldError errors={state.errors?.questionType} />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Module
              <select
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 font-normal"
                name="module"
                onChange={(event) => setModule(event.target.value)}
                value={module}
              >
                <option value="computer_science">Computer Science</option>
                <option value="core">Core Module</option>
              </select>
              <FieldError errors={state.errors?.module} />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Subject
              <input
                className="h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                defaultValue={initialQuestion?.subject ?? ""}
                name="subject"
                placeholder="e.g. Computer Science"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Topic
              <input
                className="h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                defaultValue={initialQuestion?.topic ?? ""}
                name="topic"
                placeholder="e.g. Algorithms"
                required
              />
              <FieldError errors={state.errors?.topic} />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Subtopic
              <input
                className="h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                defaultValue={initialQuestion?.subtopic ?? ""}
                name="subtopic"
                placeholder="Optional"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Difficulty
              <select
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                defaultValue={initialQuestion?.difficulty ?? "easy"}
                name="difficulty"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Source
              <select
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                defaultValue={initialQuestion?.sourceType ?? "manual"}
                name="sourceType"
              >
                <option value="manual">Manually authored</option>
                <option value="generated">Generated and reviewed</option>
                <option value="imported">Imported</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Estimated response time
              <div className="relative">
                <input
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 pr-20 font-normal"
                  defaultValue={initialQuestion?.estimatedTimeSeconds ?? 60}
                  min={10}
                  max={3600}
                  name="estimatedTimeSeconds"
                  type="number"
                />
                <span className="absolute right-4 top-3.5 font-normal text-slate-500">
                  seconds
                </span>
              </div>
              <FieldError errors={state.errors?.estimatedTimeSeconds} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Question content</CardTitle>
            <CardDescription>
              Type-specific fields appear based on the selected question format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block space-y-2 text-sm font-semibold">
              Question text
              <textarea
                className="min-h-32 w-full rounded-2xl border border-slate-300 p-4 font-normal leading-7"
                name="questionText"
                onChange={(event) => setQuestionText(event.target.value)}
                placeholder="Write the complete question prompt."
                required
                value={questionText}
              />
              <FieldError errors={state.errors?.questionText} />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Supporting passage
              <textarea
                className="min-h-24 w-full rounded-2xl border border-slate-300 p-4 font-normal leading-7"
                defaultValue={initialQuestion?.passage ?? ""}
                name="passage"
                placeholder="Optional context or passage"
              />
            </label>
            {questionType === "computer_science" ? (
              <label className="block space-y-2 text-sm font-semibold">
                Code sample
                <textarea
                  className="min-h-32 w-full rounded-md border border-workspace-border bg-code-background p-4 font-mono text-sm font-normal text-code-foreground"
                  defaultValue={initialQuestion?.code ?? ""}
                  name="code"
                  placeholder="// Optional code"
                />
              </label>
            ) : (
              <input name="code" type="hidden" value="" />
            )}
            {questionType === "mathematical_equation" ? (
              <label className="block space-y-2 text-sm font-semibold">
                Formula
                <input
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                  defaultValue={initialQuestion?.formula ?? ""}
                  name="formula"
                  placeholder="e.g. x² + 2x + 1 = 0"
                />
              </label>
            ) : (
              <input name="formula" type="hidden" value="" />
            )}
            {questionType === "figure_sequence" ||
            questionType === "latin_square" ? (
              <label className="block space-y-2 text-sm font-semibold">
                Structured diagram data
                <textarea
                  className="min-h-32 w-full rounded-2xl border border-slate-300 p-4 font-mono text-sm font-normal"
                  defaultValue={initialQuestion?.structuredData ?? ""}
                  name="structuredData"
                  placeholder='{"items":[]}'
                />
                <FieldError errors={state.errors?.structuredData} />
              </label>
            ) : (
              <input name="structuredData" type="hidden" value="" />
            )}
            <label className="block space-y-2 text-sm font-semibold">
              Supporting image URL
              <input
                className="h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                defaultValue={initialQuestion?.imageUrl ?? ""}
                name="imageUrl"
                placeholder="https://..."
                type="url"
              />
              <FieldError errors={state.errors?.imageUrl} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Answer options</CardTitle>
            <CardDescription>
              Provide exactly four unique options and select the correct answer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.map((option, index) => (
              <div className="flex items-center gap-3" key={index}>
                <label className="flex shrink-0 cursor-pointer items-center gap-2">
                  <input
                    checked={correctOptionIndex === String(index)}
                    name="correctOptionIndex"
                    onChange={() => setCorrectOptionIndex(String(index))}
                    type="radio"
                    value={index}
                  />
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-semibold">
                    {String.fromCharCode(65 + index)}
                  </span>
                </label>
                <input
                  className="h-12 flex-1 rounded-xl border border-slate-300 px-4"
                  name={`option${index}`}
                  onChange={(event) =>
                    setOptions((current) =>
                      current.map((value, optionIndex) =>
                        optionIndex === index ? event.target.value : value,
                      ),
                    )
                  }
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  required
                  value={option}
                />
              </div>
            ))}
            <FieldError errors={state.errors?.options} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="min-h-36 w-full rounded-2xl border border-slate-300 p-4 text-sm leading-7"
              defaultValue={initialQuestion?.explanation ?? ""}
              name="explanation"
              placeholder="Explain why the correct option is right and why the alternatives are not."
              required
            />
            <FieldError errors={state.errors?.explanation} />
          </CardContent>
        </Card>

        {state.message ? (
          <div
            className={
              state.status === "success"
                ? "rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
                : "rounded-2xl bg-red-50 p-4 text-sm text-red-800"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
            {state.questionId ? (
              <span className="mt-1 block font-mono text-xs">
                ID: {state.questionId}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            disabled={pending}
            name="intent"
            type="submit"
            value="draft"
            variant="secondary"
          >
            <Save className="h-4 w-4" />
            {pending
              ? "Saving..."
              : initialQuestion
                ? "Update draft"
                : "Save draft"}
          </Button>
          <Button disabled={pending} name="intent" type="submit" value="review">
            <Send className="h-4 w-4" />
            {pending
              ? "Submitting..."
              : initialQuestion
                ? "Update and submit"
                : "Submit for review"}
          </Button>
        </div>
      </div>

      <aside className="h-fit xl:sticky xl:top-28">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-700" />
              <CardTitle>Live preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{questionType.replaceAll("_", " ")}</Badge>
              <Badge variant="subtle">{module.replace("_", " ")}</Badge>
            </div>
            <p className="font-serif text-lg font-semibold leading-7">
              {questionText || "Your question prompt will appear here."}
            </p>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div
                  className={[
                    "flex items-center gap-3 rounded-xl border p-3 text-sm",
                    correctOptionIndex === String(index)
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200",
                  ].join(" ")}
                  key={index}
                >
                  <span className="font-semibold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option || `Option ${index + 1}`}</span>
                  {correctOptionIndex === String(index) ? (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-700" />
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
