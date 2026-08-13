"use client";

import type { Route } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

import {
  generateEquationPreviewAction,
  generateFigurePreviewAction,
  generateLatinPreviewAction,
} from "@/app/admin/actions";
import { QuestionRenderer } from "@/components/questions/question-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  FigureSequenceQuestion,
  GenerationDifficulty,
  LatinSquareQuestion,
  MathematicalEquationQuestion,
} from "@/lib/generation";

type GeneratedPreview = MathematicalEquationQuestion | LatinSquareQuestion | FigureSequenceQuestion;
type GenerationQuestionType = GeneratedPreview["questionType"];

export function UnifiedQuestionGenerator() {
  const [questionType, setQuestionType] = useState<GenerationQuestionType>("mathematical_equation");
  const [difficulty, setDifficulty] = useState<GenerationDifficulty>("easy");
  const [quantity, setQuantity] = useState(3);
  const [seed, setSeed] = useState("");
  const [baseSeed, setBaseSeed] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedPreview[]>([]);
  const [publishedIds, setPublishedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPublishedIds([]);
    startTransition(async () => {
      const request = { difficulty, quantity, seed };
      const response = questionType === "latin_square"
        ? await generateLatinPreviewAction(request)
        : questionType === "figure_sequence"
          ? await generateFigurePreviewAction(request)
          : await generateEquationPreviewAction(request);
      if (response.error || !response.questions || !response.questionIds) {
        setError(response.error ?? "Unable to generate and publish questions.");
        return;
      }
      setQuestions(response.questions);
      setPublishedIds(response.questionIds);
      setBaseSeed(response.baseSeed);
      setSeed(response.baseSeed);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generation configuration</CardTitle>
          <CardDescription>
            Generation and validation run server-side. A fixed seed reproduces the same Core candidate sequence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-5 xl:items-end" onSubmit={generate}>
            <label className="space-y-2 text-sm font-medium">
              Question type
              <select className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm" disabled={isPending} onChange={(event) => { setQuestionType(event.target.value as GenerationQuestionType); setQuestions([]); setPublishedIds([]); }} value={questionType}>
                <option value="mathematical_equation">Mathematical Equations</option>
                <option value="latin_square">Latin Squares</option>
                <option value="figure_sequence">Figure Sequences</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Difficulty
              <select className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm" disabled={isPending} onChange={(event) => setDifficulty(event.target.value as GenerationDifficulty)} value={difficulty}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">Quantity<Input disabled={isPending} max={20} min={1} onChange={(event) => setQuantity(Number(event.target.value))} required type="number" value={quantity} /></label>
            <label className="space-y-2 text-sm font-medium">Optional seed<Input disabled={isPending} maxLength={200} onChange={(event) => setSeed(event.target.value)} placeholder="Leave blank for a generated seed" value={seed} /></label>
            <Button disabled={isPending} type="submit"><Sparkles className="h-4 w-4" />{isPending ? "Generating and publishing…" : quantity === 1 ? "Generate & Publish" : `Generate & Publish ${quantity}`}</Button>
          </form>
          {error ? <p className="mt-4 rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">{error}</p> : null}
        </CardContent>
      </Card>

      {questions.length ? (
        <section className="space-y-4" aria-labelledby="preview-heading">
          <div className="rounded-md border border-success bg-success-container p-4 text-success-container-foreground" role="status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />{questions.length} question{questions.length === 1 ? "" : "s"} generated, validated, and published</p>
              <Button asChild size="sm" variant="outline"><Link href={"/admin/review" as Route}>View question bank</Link></Button>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-semibold" id="preview-heading">Published questions</h2><p className="mt-1 text-sm text-muted-foreground">Base seed: <span className="font-mono">{baseSeed}</span></p></div>
            <Badge variant="success"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Published automatically</Badge>
          </div>
          {questions.map((question, index) => {
            const publishedId = publishedIds[index];
            const label = question.questionType === "latin_square" ? "Latin square" : question.questionType === "figure_sequence" ? "Figure sequence" : "Equation";
            return (
              <Card key={question.metadata.fingerprint}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2"><Badge>{label} {index + 1}</Badge><Badge variant="subtle">{question.metadata.calculatedDifficulty}</Badge><Badge variant="success">Published</Badge></div>
                    <span className="break-all font-mono text-xs text-muted-foreground">Question ID: {publishedId}</span>
                  </div>
                  <CardTitle className="pt-2">{question.presentation.prompt}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <QuestionRenderer question={question} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[["Seed", question.metadata.seed], ["Attempt", String(question.metadata.attemptCount)], ["Generator", question.metadata.generatorVersion], ["Validator", question.metadata.validatorVersion]].map(([labelText, value]) => <div className="rounded-md bg-surface-low p-3" key={labelText}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelText}</p><p className="mt-1 break-all font-mono text-xs">{value}</p></div>)}
                  </div>
                  <div className="rounded-md border border-success bg-success-container p-4">
                    <p className="text-sm font-semibold text-success-container-foreground">Verified solution</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.questionType === "latin_square" ? <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold">Target = {question.correctAnswer}</span> : question.questionType === "figure_sequence" ? question.sequence.missingMatrices.map((matrix, missingIndex) => { const correct = matrix.candidates.find((candidate) => candidate.id === question.correctAnswer[missingIndex]); return <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold" key={matrix.sequenceIndex}>Matrix {missingIndex + 1} = {correct?.label ?? "Unknown"}</span>; }) : Object.entries(question.correctAnswer).sort(([first], [second]) => first.localeCompare(second)).map(([symbol, value]) => <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold" key={symbol}>{symbol} = {value}</span>)}
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md bg-surface-low p-4"><p className="text-sm font-semibold">Explanation</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-on-surface-variant">{question.explanation}</p></div>
                    <div className="rounded-md bg-surface-low p-4"><p className="text-sm font-semibold">Validation diagnostics</p><ul className="mt-2 space-y-2 text-sm">{question.validation.checks.map((check, checkIndex) => <li className="flex items-center justify-between gap-3" key={`${check.validatorVersion}-${check.stage}-${checkIndex}`}><span className="capitalize">{check.stage}</span><Badge variant={check.passed ? "success" : "warning"}>{check.passed ? "Passed" : "Failed"}</Badge></li>)}</ul><p className="mt-4 break-all font-mono text-xs text-muted-foreground">{question.metadata.fingerprint}</p><p className="mt-2 break-all text-xs text-success">Published ID: {publishedId}</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
