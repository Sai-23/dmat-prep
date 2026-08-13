"use client";

import { useState } from "react";

import { EquationRenderer } from "../questions/equation-renderer";
import { FigureSequenceRenderer } from "../questions/figure-sequence-renderer";
import { LatinSquareRenderer } from "../questions/latin-square-renderer";
import type { FigureSequencePresentation, LatinSquareStructuredData, MathematicalEquationStructuredData } from "../../lib/generation";
import type { PracticeAnswer, PracticeQuestion } from "../../lib/practice/schemas";

export function NativePracticeResponse({ question, answer, correctAnswer, disabled, hideAnswerInputs = false, onChange }: {
  question: PracticeQuestion;
  answer: PracticeAnswer | null;
  correctAnswer?: unknown;
  disabled: boolean;
  hideAnswerInputs?: boolean;
  onChange(answer: PracticeAnswer): void;
}) {
  const response = question.response ?? { kind: "single_choice" as const, options: question.options };
  if (response.kind === "symbol_assignment") {
    return <EquationResponse answer={answer} disabled={disabled} hideAnswerInputs={hideAnswerInputs} key={question.id} onChange={onChange} question={question} symbols={response.symbols} />;
  }
  if (response.kind === "two_stage_single_choice") {
    const sequence = question.structuredData as FigureSequencePresentation;
    const ids = answer?.kind === "two_stage_single_choice" ? answer.optionIds : ["", ""];
    const selected = Object.fromEntries(sequence.missingMatrices.map((matrix, index) => [matrix.sequenceIndex, ids[index]]));
    const correctIds = Array.isArray(correctAnswer) ? correctAnswer.map(String) : [];
    const correct = Object.fromEntries(sequence.missingMatrices.map((matrix, index) => [matrix.sequenceIndex, correctIds[index]]));
    return <FigureSequenceRenderer correct={correct} disabled={disabled} onSelect={(sequenceIndex, candidateId) => { const index = sequence.missingMatrices.findIndex((matrix) => matrix.sequenceIndex === sequenceIndex); const next: [string, string] = [ids[0], ids[1]]; next[index] = candidateId; onChange({ kind: "two_stage_single_choice", optionIds: next }); }} revealCorrectness={correctAnswer !== undefined} selected={selected} sequence={sequence} />;
  }
  if (question.questionType === "latin_square" && question.structuredData) {
    const selected = answer?.kind === "single_choice" ? answer.optionId : null;
    return <LatinSquareRenderer correctValue={typeof correctAnswer === "string" ? correctAnswer as LatinSquareStructuredData["symbols"][number] : null} data={question.structuredData as LatinSquareStructuredData} disabled={disabled} onChange={(symbol) => onChange({ kind: "single_choice", optionId: symbol })} revealCorrectness={correctAnswer !== undefined} value={selected as LatinSquareStructuredData["symbols"][number] | null} />;
  }
  return <ChoiceButtons answer={answer} correctAnswer={correctAnswer} disabled={disabled} onChange={onChange} options={response.options} />;
}

export function normalizeEquationInput(value: string): { raw: string; value: number | null; valid: boolean } {
  if (value === "") return { raw: "", value: null, valid: true };
  if (!/^\d{1,2}$/.test(value)) return { raw: value, value: null, valid: false };
  const raw = value.length > 1 ? value.replace(/^0+/, "") || "0" : value;
  const parsed = Number(raw);
  return { raw, value: parsed >= 1 && parsed <= 20 ? parsed : null, valid: parsed >= 1 && parsed <= 20 };
}

function EquationResponse({ question, symbols, answer, disabled, hideAnswerInputs, onChange }: { question: PracticeQuestion; symbols: string[]; answer: PracticeAnswer | null; disabled: boolean; hideAnswerInputs: boolean; onChange(answer: PracticeAnswer): void }) {
  const initialValues = answer?.kind === "symbol_assignment" ? answer.values : {};
  const [rawValues, setRawValues] = useState<Record<string, string>>(() => Object.fromEntries(symbols.map((symbol) => [symbol, initialValues[symbol]?.toString() ?? ""])));
  const values = answer?.kind === "symbol_assignment" ? answer.values : {};
  return <div className="space-y-4"><EquationRenderer data={question.structuredData as MathematicalEquationStructuredData} />{hideAnswerInputs ? null : <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-3" data-response-interface="equation-variable-values">{symbols.map((symbol) => { const normalized = normalizeEquationInput(rawValues[symbol] ?? ""); return <label className="space-y-2 text-sm font-semibold" key={symbol}><span>{symbol} =</span><input aria-invalid={!normalized.valid} aria-label={`${symbol} value`} className="h-12 w-full rounded-md border border-workspace-border bg-surface-lowest px-3 text-center font-mono text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" disabled={disabled} inputMode="numeric" maxLength={2} onChange={(event) => { const next = normalizeEquationInput(event.target.value); if (!/^\d{0,2}$/.test(event.target.value)) return; setRawValues((current) => ({ ...current, [symbol]: next.raw })); const nextValues = { ...values }; if (next.value === null) delete nextValues[symbol]; else nextValues[symbol] = next.value; onChange({ kind: "symbol_assignment", values: nextValues }); }} pattern="[0-9]*" type="text" value={rawValues[symbol] ?? ""} />{!normalized.valid ? <span className="block text-xs font-normal text-error">Enter a whole number from 1 to 20.</span> : null}</label>; })}</div>}</div>;
}

function ChoiceButtons({ options, answer, correctAnswer, disabled, onChange }: { options: Array<{ id: string; label: string; content: string }>; answer: PracticeAnswer | null; correctAnswer?: unknown; disabled: boolean; onChange(answer: PracticeAnswer): void }) {
  const selected = answer?.kind === "single_choice" ? answer.optionId : null;
  return <div className="grid gap-3" data-response-interface="generic-single-choice">{options.map((option) => { const correct = correctAnswer === option.id; return <button className={correct ? "rounded-md border border-success bg-success-container p-4 text-left" : selected === option.id ? "rounded-md border-2 border-primary bg-primary-muted p-4 text-left" : "rounded-md border border-workspace-border p-4 text-left"} disabled={disabled} key={option.id} onClick={() => onChange({ kind: "single_choice", optionId: option.id })} type="button"><b className="mr-2">{option.label}.</b>{option.content}</button>; })}</div>;
}
