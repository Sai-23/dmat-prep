"use client";

import { CheckCircle2, Database, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

import {
  generateEquationPreviewAction,
  generateFigurePreviewAction,
  generateComputerSciencePreviewAction,
  generateLatinPreviewAction,
  saveGeneratedEquationAction,
  saveGeneratedFigureAction,
  saveGeneratedComputerScienceAction,
  saveGeneratedLatinAction,
} from "@/app/admin/actions";
import { QuestionRenderer } from "@/components/questions/question-renderer";
import { ComputerScienceSubjectRenderer } from "@/components/questions/computer-science-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  GenerationDifficulty,
  FigureSequenceQuestion,
  ComputerScienceFamily,
  GeneratedComputerScienceUnit,
  GeneratedSubjectTestlet,
  LogicTestletSize,
  LatinSquareQuestion,
  MathematicalEquationQuestion,
} from "@/lib/generation";

type CorePreview = MathematicalEquationQuestion | LatinSquareQuestion | FigureSequenceQuestion;
type GeneratedPreview = CorePreview | GeneratedComputerScienceUnit;
type GenerationQuestionType = CorePreview["questionType"] | "computer_science";

function isComputerScienceUnit(question: GeneratedPreview): question is GeneratedComputerScienceUnit {
  return "family" in question && question.module === "computer_science";
}

function isSubjectTestletUnit(question: GeneratedPreview): question is GeneratedSubjectTestlet {
  return isComputerScienceUnit(question) && "testlet" in question;
}

export function UnifiedQuestionGenerator() {
  const [questionType, setQuestionType] =
    useState<GenerationQuestionType>("mathematical_equation");
  const [difficulty, setDifficulty] = useState<GenerationDifficulty>("easy");
  const [computerScienceFamily, setComputerScienceFamily] = useState<ComputerScienceFamily>("boolean_truth_tables");
  const [computerScienceModule, setComputerScienceModule] = useState<"boolean_logic" | "programming">("boolean_logic");
  const [testletSize, setTestletSize] = useState<LogicTestletSize>("auto");
  const [generationMode, setGenerationMode] = useState<"deterministic" | "hybrid_dynamic">("deterministic");
  const [quantity, setQuantity] = useState(3);
  const [seed, setSeed] = useState("");
  const [baseSeed, setBaseSeed] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedPreview[]>([]);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [savingFingerprint, setSavingFingerprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved({});
    startTransition(async () => {
      const request = { difficulty, quantity, seed };
      const response = questionType === "latin_square"
        ? await generateLatinPreviewAction(request)
        : questionType === "figure_sequence"
          ? await generateFigurePreviewAction(request)
          : questionType === "computer_science"
            ? await generateComputerSciencePreviewAction({ ...request, family: computerScienceFamily, targetSize: testletSize, generationMode })
          : await generateEquationPreviewAction(request);
      if (response.error || !response.questions) {
        setError(response.error ?? "Unable to generate previews.");
        return;
      }
      setQuestions(response.questions);
      setBaseSeed(response.baseSeed);
      setSeed(response.baseSeed);
    });
  };

  const save = (question: GeneratedPreview) => {
    setError(null);
    setSavingFingerprint(question.metadata.fingerprint);
    startTransition(async () => {
      const provenance = {
        seed: question.metadata.seed,
        difficulty: question.metadata.requestedDifficulty,
        attemptCount: question.metadata.attemptCount,
        fingerprint: question.metadata.fingerprint,
        ...(isComputerScienceUnit(question) ? { family: question.family === "programming_testlet" ? "programming_trace" : question.family === "recursion_testlet" ? "programming_recursion" : question.family === "oop_testlet" ? "programming_oop" : question.family === "circuit_testlet" || question.family === "combinational_circuits" ? "combinational_circuits" : "boolean_truth_tables", targetSize: question.questions.length as LogicTestletSize, generationMode: isSubjectTestletUnit(question) && question.testlet.metadata.modelIdentifier !== "none" ? "hybrid_dynamic" : "deterministic", ...(isSubjectTestletUnit(question) && question.testlet.metadata.modelIdentifier !== "none" ? { snapshot: question.testlet } : {}) } : {}),
      };
      const response = isComputerScienceUnit(question)
        ? await saveGeneratedComputerScienceAction(provenance)
        : question.questionType === "latin_square"
        ? await saveGeneratedLatinAction(provenance)
        : question.questionType === "figure_sequence"
          ? await saveGeneratedFigureAction(provenance)
          : await saveGeneratedEquationAction(provenance);
      setSavingFingerprint(null);
      if (response.error || !response.questionId) {
        setError(response.error ?? "Unable to save this draft.");
        return;
      }
      setSaved((current) => ({
        ...current,
        [question.metadata.fingerprint]: response.questionId,
      }));
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generation configuration</CardTitle>
          <CardDescription>
            Generation and validation run server-side. A fixed seed reproduces the same
            candidate sequence for the selected difficulty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-6 xl:items-end" onSubmit={generate}>
            <label className="space-y-2 text-sm font-medium">
              Question type
              <select
                className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm"
                disabled={isPending}
                onChange={(event) => {
                  setQuestionType(event.target.value as GenerationQuestionType);
                  setQuestions([]);
                  setSaved({});
                }}
                value={questionType}
              >
                <option value="mathematical_equation">Mathematical Equations</option>
                <option value="latin_square">Latin Squares</option>
                <option value="figure_sequence">Figure Sequences</option>
                <option value="computer_science">Computer Science</option>
              </select>
            </label>
            {questionType === "computer_science" ? (
              <label className="space-y-2 text-sm font-medium">
                Module
                <select className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm" disabled={isPending} onChange={(event) => {
                  const selectedModule = event.target.value as "boolean_logic" | "programming";
                  setComputerScienceModule(selectedModule);
                  setComputerScienceFamily(selectedModule === "programming" ? "programming_trace" : "boolean_truth_tables");
                  setQuestions([]);
                  setSaved({});
                }} value={computerScienceModule}>
                  <option value="boolean_logic">Boolean Logic</option>
                  <option value="programming">Programming</option>
                </select>
              </label>
            ) : null}
            {questionType === "computer_science" ? (
              <label className="space-y-2 text-sm font-medium">
                Topic / family
                <select
                  className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm"
                  disabled={isPending}
                  onChange={(event) => {
                    setComputerScienceFamily(event.target.value as ComputerScienceFamily);
                    setQuestions([]);
                    setSaved({});
                  }}
                  value={computerScienceFamily}
                >
                  {computerScienceModule === "programming" ? <><option value="programming_trace">Loops, arrays &amp; functions</option><option value="programming_recursion">Recursion</option><option value="programming_oop">Basic OOP</option></> : <><option value="boolean_truth_tables">Boolean expressions &amp; truth tables</option><option value="combinational_circuits">Combinational circuits</option></>}
                </select>
              </label>
            ) : null}
            {questionType === "computer_science" ? (
              <label className="space-y-2 text-sm font-medium">
                Generation mode
                <select className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm" disabled={isPending || computerScienceModule !== "programming"} onChange={(event) => setGenerationMode(event.target.value as "deterministic" | "hybrid_dynamic")} value={generationMode}>
                  <option value="deterministic">Deterministic verified</option>
                  <option value="hybrid_dynamic">Hybrid dynamic (OpenAI + critic)</option>
                </select>
              </label>
            ) : null}
            {questionType === "computer_science" ? (
              <label className="space-y-2 text-sm font-medium">
                Target testlet size
                <select className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm" disabled={isPending} onChange={(event) => setTestletSize(event.target.value === "auto" ? "auto" : Number(event.target.value) as LogicTestletSize)} value={testletSize}>
                  <option value="auto">Auto (4–8)</option>
                  {[4, 5, 6, 7, 8].map((size) => <option key={size} value={size}>{size} questions</option>)}
                </select>
              </label>
            ) : null}
            <label className="space-y-2 text-sm font-medium">
              Difficulty
              <select
                className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm"
                disabled={isPending}
                onChange={(event) => setDifficulty(event.target.value as GenerationDifficulty)}
                value={difficulty}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Quantity
              <Input
                disabled={isPending}
                max={20}
                min={1}
                onChange={(event) => setQuantity(Number(event.target.value))}
                required
                type="number"
                value={quantity}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Optional seed
              <Input
                disabled={isPending}
                maxLength={200}
                onChange={(event) => setSeed(event.target.value)}
                placeholder="Leave blank for a generated seed"
                value={seed}
              />
            </label>
            <Button disabled={isPending} type="submit">
              <Sparkles className="h-4 w-4" />
              {isPending && !savingFingerprint ? "Generating…" : "Generate preview"}
            </Button>
          </form>
          {error ? (
            <p className="mt-4 rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {questions.length ? (
        <section className="space-y-4" aria-labelledby="preview-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold" id="preview-heading">
                Validated preview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {questions.length} original candidate{questions.length === 1 ? "" : "s"} · Base seed: <span className="font-mono">{baseSeed}</span>
              </p>
            </div>
            <Badge variant="success">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              All checks passed
            </Badge>
          </div>

          {questions.map((question, index) => {
            const savedId = saved[question.metadata.fingerprint];
            return (
              <Card key={question.metadata.fingerprint}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge>
                        {isComputerScienceUnit(question)
                          ? question.topic
                          : question.questionType === "latin_square"
                          ? "Latin square"
                          : question.questionType === "figure_sequence"
                            ? "Figure sequence"
                            : "Equation"} {index + 1}
                      </Badge>
                      <Badge variant="subtle">{question.metadata.calculatedDifficulty}</Badge>
                      <Badge variant="success">Validated</Badge>
                      {isSubjectTestletUnit(question) && question.family === "programming_testlet" ? (
                        <>
                          <Badge variant="subtle">Class A · solver verified</Badge>
                          <Badge variant="subtle">
                            {String((question.testlet.metadata.semanticParameters as Record<string, unknown>).structure ?? "forward_transform").replaceAll("_", " ")}
                          </Badge>
                        </>
                      ) : null}
                    </div>
                    <Button
                      disabled={isPending || Boolean(savedId)}
                      onClick={() => save(question)}
                      variant={savedId ? "secondary" : "default"}
                    >
                      {savedId ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                      {savedId
                        ? "Draft saved"
                        : savingFingerprint === question.metadata.fingerprint
                          ? "Saving…"
                          : "Save draft"}
                    </Button>
                  </div>
                  <CardTitle className="pt-2">
                    {isComputerScienceUnit(question)
                      ? question.stimulus.title ?? "Computer Science subject stimulus"
                      : question.presentation.prompt}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {isComputerScienceUnit(question) ? (
                    <ComputerScienceSubjectRenderer unit={question} />
                  ) : (
                    <QuestionRenderer question={question} />
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Seed", question.metadata.seed],
                      ["Attempt", String(question.metadata.attemptCount)],
                      ["Generator", question.metadata.generatorVersion],
                      ["Validator", question.metadata.validatorVersion],
                      ...(isSubjectTestletUnit(question) && question.testlet.metadata.semanticFingerprint
                        ? [["Semantic fingerprint", question.testlet.metadata.semanticFingerprint]]
                        : []),
                    ].map(([label, value]) => (
                      <div className="rounded-md bg-surface-low p-3" key={label}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                        <p className="mt-1 break-all font-mono text-xs">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md border border-success bg-success-container p-4">
                    <p className="text-sm font-semibold text-success-container-foreground">Verified solution</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isComputerScienceUnit(question) ? (
                        question.questions.map((child, childIndex) => {
                          const correct = child.options.find((option) => option.id === child.correctOptionId);
                          return (
                            <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold" key={child.id}>
                              Question {childIndex + 1} = {correct?.label ?? "Unknown"} ({String(correct?.content ?? "")})
                            </span>
                          );
                        })
                      ) : question.questionType === "latin_square" ? (
                        <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold">
                          Target = {question.correctAnswer}
                        </span>
                      ) : question.questionType === "figure_sequence" ? (
                        question.sequence.missingMatrices.map((matrix, missingIndex) => {
                          const correct = matrix.candidates.find(
                            (candidate) => candidate.id === question.correctAnswer[missingIndex],
                          );
                          return (
                            <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold" key={matrix.sequenceIndex}>
                              Matrix {missingIndex + 1} = {correct?.label ?? "Unknown"}
                            </span>
                          );
                        })
                      ) : (
                        Object.entries(question.correctAnswer)
                          .sort(([first], [second]) => first.localeCompare(second))
                          .map(([symbol, value]) => (
                            <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold" key={symbol}>
                              {symbol} = {value}
                            </span>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md bg-surface-low p-4">
                      <p className="text-sm font-semibold">Explanation</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-on-surface-variant">
                        {isComputerScienceUnit(question)
                          ? question.questions.map((child) => child.explanation).join("\n")
                          : question.explanation}
                      </p>
                    </div>
                    <div className="rounded-md bg-surface-low p-4">
                      <p className="text-sm font-semibold">Validation diagnostics</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {question.validation.checks.map((validationCheck, checkIndex) => (
                          <li
                            className="flex items-center justify-between gap-3"
                            key={`${validationCheck.validatorVersion}-${validationCheck.stage}-${checkIndex}`}
                          >
                            <span className="capitalize">{validationCheck.stage}</span>
                            <Badge variant={validationCheck.passed ? "success" : "warning"}>
                              {validationCheck.passed ? "Passed" : "Failed"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 break-all font-mono text-xs text-muted-foreground">
                        {question.metadata.fingerprint}
                      </p>
                      {savedId ? (
                        <p className="mt-2 break-all text-xs text-success">Draft ID: {savedId}</p>
                      ) : null}
                    </div>
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
