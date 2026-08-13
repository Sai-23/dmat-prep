import { Check, X } from "lucide-react";

import { FigureMatrixSvg } from "../questions/figure-matrix-svg";
import { MathematicalEquationAnswerReview } from "./mathematical-equation-answer-review";
import type { FigureSequencePresentation } from "../../lib/generation";
import type { PracticeAnswer, PracticeQuestion } from "../../lib/practice/schemas";

export function PracticeAnswerFeedback({ question, answer, correctAnswer }: {
  question: PracticeQuestion;
  answer: PracticeAnswer | null;
  correctAnswer: unknown;
}) {
  if (question.response?.kind === "symbol_assignment") {
    const selectedAnswer = answer?.kind === "symbol_assignment" ? answer.values : {};
    return (
      <MathematicalEquationAnswerReview
        correctAnswer={correctAnswer}
        selectedAnswer={selectedAnswer}
        symbols={question.response.symbols}
      />
    );
  }

  if (
    question.response?.kind !== "two_stage_single_choice" ||
    answer?.kind !== "two_stage_single_choice" ||
    !Array.isArray(correctAnswer)
  ) {
    return (
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Your answer</dt><dd className="mt-1 break-words font-mono text-xs">{JSON.stringify(answer)}</dd></div>
        <div><dt className="font-semibold">Correct answer</dt><dd className="mt-1 break-words font-mono text-xs">{JSON.stringify(correctAnswer)}</dd></div>
      </dl>
    );
  }

  const sequence = question.structuredData as FigureSequencePresentation;
  const correctIds = correctAnswer.map(String);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <FigureAnswerGroup heading="Your answer" ids={answer.optionIds} correctIds={correctIds} sequence={sequence} showResult />
      <FigureAnswerGroup heading="Correct answer" ids={correctIds} correctIds={correctIds} sequence={sequence} showResult />
    </div>
  );
}

function FigureAnswerGroup({ heading, ids, correctIds, sequence, showResult }: {
  heading: string;
  ids: readonly string[];
  correctIds: readonly string[];
  sequence: FigureSequencePresentation;
  showResult: boolean;
}) {
  return (
    <section aria-label={heading}>
      <h4 className="text-sm font-semibold uppercase tracking-wide">{heading}</h4>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {sequence.missingMatrices.map((missing, index) => {
          const candidate = missing.candidates.find((item) => item.id === ids[index]);
          const correct = ids[index] === correctIds[index];
          return (
            <div className="overflow-hidden rounded-md border border-current bg-white" key={missing.sequenceIndex}>
              <div className="flex items-center justify-between bg-surface-low px-3 py-2 text-xs font-semibold text-on-surface">
                <span>Matrix {index + 1} · {candidate?.label ?? "Not answered"}</span>
                {showResult && correct ? <Check aria-label="Correct" className="h-4 w-4 text-success" /> : showResult ? <X aria-label="Incorrect" className="h-4 w-4 text-error" /> : null}
              </div>
              {candidate ? <FigureMatrixSvg frame={candidate.frame} grid={sequence.grid} label={`${heading}, matrix ${index + 1}, option ${candidate.label}`} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
