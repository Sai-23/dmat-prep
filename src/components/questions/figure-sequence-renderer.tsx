"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useState } from "react";

import { FigureMatrixSvg } from "./figure-matrix-svg";
import type { FigureSequencePresentation } from "@/lib/generation";
import { cn } from "@/lib/utils";

export function FigureSequenceRenderer({
  sequence,
  selected: controlledSelected,
  onSelect,
  disabled = false,
  correct,
  revealCorrectness = false,
}: {
  sequence: FigureSequencePresentation;
  selected?: Record<number, string>;
  onSelect?: (sequenceIndex: number, candidateId: string) => void;
  disabled?: boolean;
  correct?: Record<number, string>;
  revealCorrectness?: boolean;
}) {
  const [internalSelected, setInternalSelected] = useState<Record<number, string>>({});
  const selected = controlledSelected ?? internalSelected;

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-3">
          {sequence.visibleFrames.map((frame, index) => (
            <div className="flex items-center gap-3" key={frame.index}>
              <div className="w-40 overflow-hidden rounded-md border border-workspace-border bg-white shadow-sm">
                <FigureMatrixSvg
                  frame={frame}
                  grid={sequence.grid}
                  label={`Visible matrix ${index + 1}`}
                />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
          ))}
          {sequence.missingMatrices.map((missing, index) => (
            <div className="flex items-center gap-3" key={missing.sequenceIndex}>
              <div className="flex aspect-square w-40 items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary-muted text-4xl font-semibold text-primary">
                ?
                <span className="sr-only">Missing matrix {index + 1}</span>
              </div>
              {index === 0 ? (
                <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {sequence.missingMatrices.map((missing, missingIndex) => (
          <fieldset className="rounded-lg border border-workspace-border p-4" key={missing.sequenceIndex}>
            <legend className="px-2 text-sm font-semibold">
              Candidates for missing matrix {missingIndex + 1}
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {missing.candidates.map((candidate) => {
                const isSelected = selected[missing.sequenceIndex] === candidate.id;
                const isCorrect = revealCorrectness && correct?.[missing.sequenceIndex] === candidate.id;
                const isIncorrect = revealCorrectness && isSelected && !isCorrect;
                return (
                  <button
                    aria-label={`${candidate.label}, candidate for missing matrix ${missingIndex + 1}${isCorrect ? ", correct answer" : isIncorrect ? ", your answer, incorrect" : isSelected ? ", selected" : ""}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative overflow-hidden rounded-md border-2 bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isCorrect
                        ? "border-success ring-2 ring-success-container"
                        : isIncorrect
                          ? "border-error ring-2 ring-error-container"
                          : isSelected
                            ? "border-primary bg-primary-muted ring-2 ring-primary-muted"
                        : "border-workspace-border hover:border-primary",
                    )}
                    data-candidate-state={isCorrect ? "correct" : isIncorrect ? "incorrect" : isSelected ? "selected" : "neutral"}
                    key={candidate.id}
                    disabled={disabled}
                    onClick={() => {
                      onSelect?.(missing.sequenceIndex, candidate.id);
                      if (!controlledSelected) {
                        setInternalSelected((current) => ({ ...current, [missing.sequenceIndex]: candidate.id }));
                      }
                    }}
                    type="button"
                  >
                    {isCorrect ? (
                      <span className="absolute right-2 top-2 z-10 rounded-full bg-success p-1 text-white" title="Correct answer">
                        <Check aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only">Correct answer</span>
                      </span>
                    ) : isIncorrect ? (
                      <span className="absolute right-2 top-2 z-10 rounded-full bg-error p-1 text-white" title="Your answer is incorrect">
                        <X aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only">Your answer is incorrect</span>
                      </span>
                    ) : null}
                    <FigureMatrixSvg
                      frame={candidate.frame}
                      grid={sequence.grid}
                      label={`${candidate.label}, candidate for missing matrix ${missingIndex + 1}`}
                    />
                    <span className="block border-t border-workspace-border px-3 py-2 text-center text-sm font-semibold text-on-surface">
                      {candidate.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
