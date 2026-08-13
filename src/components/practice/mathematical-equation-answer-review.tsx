import { Check, X } from "lucide-react";

import type { VariableAssignment } from "@/lib/generation/mathematical-equations";
import { cn } from "@/lib/utils";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function expectedValues(
  symbols: readonly string[],
  correctAnswer: unknown,
): VariableAssignment | null {
  const source = record(correctAnswer);
  if (!source) return null;
  const values: VariableAssignment = {};
  for (const symbol of symbols) {
    const value = source[symbol];
    if (!Number.isInteger(value)) return null;
    values[symbol] = Number(value);
  }
  return values;
}

export function MathematicalEquationAnswerReview({
  symbols,
  selectedAnswer,
  correctAnswer,
}: {
  symbols: readonly string[];
  selectedAnswer: Partial<VariableAssignment>;
  correctAnswer: unknown;
}) {
  const expected = expectedValues(symbols, correctAnswer);
  if (!expected) {
    return (
      <section
        className="rounded-lg border border-workspace-border bg-surface-low p-4"
        data-answer-review="mathematical-equation"
      >
        <h4 className="text-xs font-semibold uppercase tracking-wide text-on-surface">
          Answer review
        </h4>
        <p className="mt-2 text-sm text-muted-foreground">
          Answer details unavailable for this attempt.
        </p>
      </section>
    );
  }

  const correctCount = symbols.filter((symbol) =>
    selectedAnswer[symbol] === expected[symbol],
  ).length;
  const allCorrect = symbols.length > 0 && correctCount === symbols.length;

  return (
    <section data-answer-review="mathematical-equation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface">
          Answer review
        </h4>
        <p className={cn(
          "flex items-center gap-1.5 text-sm font-semibold",
          allCorrect ? "text-success" : "text-on-surface",
        )}>
          {allCorrect ? (
            <>
              <Check aria-hidden="true" className="h-4 w-4" />
              All values correct
            </>
          ) : `${correctCount} of ${symbols.length} values correct`}
        </p>
      </div>
      <div className="mt-3 space-y-2" role="list" aria-label="Variable answer comparison">
        {symbols.map((symbol) => {
          const submitted = selectedAnswer[symbol];
          const correct = expected[symbol];
          const answered = Number.isInteger(submitted);
          const matches = answered && submitted === correct;
          const status = matches ? "Correct" : answered ? "Incorrect" : "Not answered";
          return (
            <div
              aria-label={`Variable ${symbol}. Your answer ${answered ? submitted : "not answered"}. Correct answer ${correct}. ${status}.`}
              className={cn(
                "grid gap-3 rounded-lg border p-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_7rem] sm:items-center",
                matches
                  ? "border-success bg-success-container/60"
                  : "border-error bg-error-container/60",
              )}
              data-variable-result={matches ? "correct" : answered ? "incorrect" : "unanswered"}
              key={symbol}
              role="listitem"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-current font-mono text-base font-bold">
                {symbol}
              </span>
              <dl className="grid gap-2 text-sm sm:contents">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your answer
                  </dt>
                  <dd className="mt-0.5 font-mono text-base font-semibold text-on-surface">
                    {answered ? submitted : "—"}
                    {!answered ? <span className="ml-2 font-sans text-xs font-medium text-muted-foreground">Not answered</span> : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Correct answer
                  </dt>
                  <dd className="mt-0.5 font-mono text-base font-semibold text-on-surface">
                    {correct}
                  </dd>
                </div>
              </dl>
              <span className={cn(
                "flex items-center gap-1.5 text-sm font-semibold",
                matches ? "text-success" : "text-error",
              )}>
                {matches ? (
                  <Check aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <X aria-hidden="true" className="h-4 w-4" />
                )}
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
