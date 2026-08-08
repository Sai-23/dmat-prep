"use client";

import { useState } from "react";

import { EquationRenderer } from "../questions/equation-renderer";
import { FigureSequenceRenderer } from "../questions/figure-sequence-renderer";
import { LatinSquareRenderer } from "../questions/latin-square-renderer";
import { SubjectContentBlocks } from "../questions/computer-science-renderer";
import type { FigureSequencePresentation, LatinSquareStructuredData, MathematicalEquationStructuredData, PresentationBlock } from "../../lib/generation";
import type { PracticeAnswer, PracticeQuestion } from "../../lib/practice/schemas";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function NativePracticeResponse({ question, answer, correctAnswer, disabled, onChange }: {
  question: PracticeQuestion;
  answer: PracticeAnswer | null;
  correctAnswer?: unknown;
  disabled: boolean;
  onChange(answer: PracticeAnswer): void;
}) {
  const response = question.response ?? { kind: "single_choice" as const, options: question.options };
  if (response.kind === "symbol_assignment") {
    return <EquationResponse answer={answer} disabled={disabled} key={question.id} onChange={onChange} question={question} symbols={response.symbols} />;
  }
  if (response.kind === "two_stage_single_choice") {
    const sequence = question.structuredData as FigureSequencePresentation;
    const ids = answer?.kind === "two_stage_single_choice" ? answer.optionIds : ["", ""];
    const selected = Object.fromEntries(sequence.missingMatrices.map((matrix, index) => [matrix.sequenceIndex, ids[index]]));
    const correctIds = Array.isArray(correctAnswer) ? correctAnswer.map(String) : [];
    const correct = Object.fromEntries(sequence.missingMatrices.map((matrix, index) => [matrix.sequenceIndex, correctIds[index]]));
    return <FigureSequenceRenderer correct={correct} disabled={disabled} onSelect={(sequenceIndex, candidateId) => { const index = sequence.missingMatrices.findIndex((matrix) => matrix.sequenceIndex === sequenceIndex); const next: [string, string] = [ids[0], ids[1]]; next[index] = candidateId; onChange({ kind: "two_stage_single_choice", optionIds: next }); }} revealCorrectness={correctAnswer !== undefined} selected={selected} sequence={sequence} />;
  }
  if (response.kind === "subject_answers") {
    return <SubjectAnswersResponse answer={answer} correctAnswer={correctAnswer} disabled={disabled} onChange={onChange} question={question} />;
  }
  if (question.questionType === "latin_square" && question.structuredData) {
    const selected = answer?.kind === "single_choice" ? answer.optionId : null;
    return <LatinSquareRenderer
      correctValue={typeof correctAnswer === "string" ? correctAnswer as LatinSquareStructuredData["symbols"][number] : null}
      data={question.structuredData as LatinSquareStructuredData}
      disabled={disabled}
      onChange={(symbol) => onChange({ kind: "single_choice", optionId: symbol })}
      revealCorrectness={correctAnswer !== undefined}
      value={selected as LatinSquareStructuredData["symbols"][number] | null}
    />;
  }
  return <ChoiceButtons answer={answer} correctAnswer={correctAnswer} disabled={disabled} onChange={onChange} options={response.options} />;
}

function SubjectAnswersResponse({ question, answer, correctAnswer, disabled, onChange }: {
  question: PracticeQuestion;
  answer: PracticeAnswer | null;
  correctAnswer?: unknown;
  disabled: boolean;
  onChange(answer: PracticeAnswer): void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const data = record(question.structuredData) ?? {};
  const stimulus = record(data.stimulus);
  const children = Array.isArray(data.questions) ? data.questions : [];
  const answers = answer?.kind === "subject_answers" ? answer.answers : {};
  const expected = record(correctAnswer as never) ?? {};
  const child = record(children[activeIndex] as never) ?? {};
  const id = String(child.id ?? activeIndex);
  const options = Array.isArray(child.options) ? child.options : [];
  const blocks = (child.blocks ?? []) as PresentationBlock[];
  const selectedId = answers[id];
  const expectedId = typeof expected[id] === "string" ? String(expected[id]) : undefined;
  const selectedOption = options.map((value) => record(value as never)).find((option) => option?.id === selectedId);
  const expectedOption = options.map((value) => record(value as never)).find((option) => option?.id === expectedId);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" data-response-interface="computer-science-subject">
      {stimulus ? (
        <section className="self-start rounded-md bg-surface-low p-5 lg:sticky lg:top-4" data-shared-stimulus>
          <h2 className="font-semibold">{String(stimulus.title ?? "Subject stimulus")}</h2>
          <div className="mt-3"><SubjectContentBlocks blocks={(stimulus.blocks ?? []) as PresentationBlock[]} /></div>
        </section>
      ) : null}
      <section className="rounded-md border border-workspace-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Question {activeIndex + 1} of {children.length}</p>
        {blocks.length ? <div className="mt-3"><p className="mb-2 text-sm font-semibold">Input scenario S{activeIndex + 1}</p><SubjectContentBlocks blocks={blocks} label={`Input scenario S${activeIndex + 1}`} /></div> : null}
        <h3 className="mt-4 font-semibold">{String(child.prompt ?? "").replace(/^For input scenario S\d+,\s*/i, "")}</h3>
        <div className="mt-3 grid gap-2" role="radiogroup" aria-label={`Options for question ${activeIndex + 1}`}>
          {options.map((optionValue) => {
            const option = record(optionValue as never) ?? {};
            const optionId = String(option.id ?? "");
            const selected = selectedId === optionId;
            const correct = expectedId === optionId;
            const stateClass = correctAnswer !== undefined && correct
              ? "border-success bg-success-container"
              : selected ? "border-primary bg-primary-muted" : "border-workspace-border bg-surface-lowest";
            return <button aria-checked={selected} className={`rounded-md border-2 p-3 text-left ${stateClass}`} disabled={disabled} key={optionId} onClick={() => onChange({ kind: "subject_answers", answers: { ...answers, [id]: optionId } })} role="radio" type="button"><b className="mr-2">{String(option.label ?? "")}.</b>{String(option.content ?? "")}</button>;
          })}
        </div>
        {correctAnswer !== undefined && expectedId ? (
          <div className="mt-4 rounded-md border border-workspace-border bg-surface-low p-4 text-sm" role="status">
            <p className="font-semibold">{selectedId === expectedId ? "Correct" : "Not quite"}</p>
            <p className="mt-2">For S{activeIndex + 1}, trace the gates from G1 downward using the input values shown.</p>
            <p className="mt-2">Your answer: <b>{String(selectedOption?.content ?? "No answer")}</b></p>
            <p>Correct answer: <b>{String(expectedOption?.content ?? "")}</b></p>
          </div>
        ) : null}
        {children.length > 1 ? (
          <nav aria-label="Related questions" className="mt-5 flex items-center justify-between gap-3">
            <button className="rounded-md border border-workspace-border px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} type="button">Previous</button>
            <div className="flex gap-2">{children.map((_, index) => <button aria-label={`Go to question ${index + 1}`} className={index === activeIndex ? "h-2.5 w-7 rounded-full bg-primary" : "h-2.5 w-2.5 rounded-full bg-outline"} key={index} onClick={() => setActiveIndex(index)} type="button" />)}</div>
            <button className="rounded-md border border-workspace-border px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={activeIndex === children.length - 1} onClick={() => setActiveIndex((index) => Math.min(children.length - 1, index + 1))} type="button">Next</button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

export function normalizeEquationInput(value: string): { raw: string; value: number | null; valid: boolean } {
  if (value === "") return { raw: "", value: null, valid: true };
  if (!/^\d{1,2}$/.test(value)) return { raw: value, value: null, valid: false };
  const raw = value.length > 1 ? value.replace(/^0+/, "") || "0" : value;
  const parsed = Number(raw);
  return { raw, value: parsed >= 1 && parsed <= 20 ? parsed : null, valid: parsed >= 1 && parsed <= 20 };
}

function EquationResponse({ question, symbols, answer, disabled, onChange }: {
  question: PracticeQuestion;
  symbols: string[];
  answer: PracticeAnswer | null;
  disabled: boolean;
  onChange(answer: PracticeAnswer): void;
}) {
  const initialValues = answer?.kind === "symbol_assignment" ? answer.values : {};
  const [rawValues, setRawValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(symbols.map((symbol) => [symbol, initialValues[symbol]?.toString() ?? ""])),
  );
  const values = answer?.kind === "symbol_assignment" ? answer.values : {};
  return (
    <div className="space-y-4">
      <EquationRenderer data={question.structuredData as MathematicalEquationStructuredData} />
      <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-3" data-response-interface="equation-variable-values">
        {symbols.map((symbol) => {
          const normalized = normalizeEquationInput(rawValues[symbol] ?? "");
          return (
            <label className="space-y-2 text-sm font-semibold" key={symbol}>
              <span>{symbol} =</span>
              <input
                aria-invalid={!normalized.valid}
                aria-label={`${symbol} value`}
                className="h-12 w-full rounded-md border border-workspace-border bg-surface-lowest px-3 text-center font-mono text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                disabled={disabled}
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => {
                  const next = normalizeEquationInput(event.target.value);
                  if (!/^\d{0,2}$/.test(event.target.value)) return;
                  setRawValues((current) => ({ ...current, [symbol]: next.raw }));
                  const nextValues = { ...values };
                  if (next.value === null) delete nextValues[symbol];
                  else nextValues[symbol] = next.value;
                  onChange({ kind: "symbol_assignment", values: nextValues });
                }}
                pattern="[0-9]*"
                type="text"
                value={rawValues[symbol] ?? ""}
              />
              {!normalized.valid ? <span className="block text-xs font-normal text-error">Enter a whole number from 1 to 20.</span> : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceButtons({ options, answer, correctAnswer, disabled, onChange }: { options: Array<{ id: string; label: string; content: string }>; answer: PracticeAnswer | null; correctAnswer?: unknown; disabled: boolean; onChange(answer: PracticeAnswer): void }) {
  const selected = answer?.kind === "single_choice" ? answer.optionId : null;
  return <div className="grid gap-3" data-response-interface="generic-single-choice">{options.map((option) => { const correct = correctAnswer === option.id; return <button className={correct ? "rounded-md border border-success bg-success-container p-4 text-left" : selected === option.id ? "rounded-md border-2 border-primary bg-primary-muted p-4 text-left" : "rounded-md border border-workspace-border p-4 text-left"} disabled={disabled} key={option.id} onClick={() => onChange({ kind: "single_choice", optionId: option.id })} type="button"><b className="mr-2">{option.label}.</b>{option.content}</button>; })}</div>;
}
