import type {
  MathematicalEquation,
  MathematicalEquationStructuredData,
  MathematicalExpression,
} from "@/lib/generation/mathematical-equations";
import { cn } from "@/lib/utils";

function expressionText(expression: MathematicalExpression): string {
  if (expression.kind === "constant") return String(expression.value);
  if (expression.kind === "variable") return expression.symbol;
  const operator = {
    add: "+",
    subtract: "−",
    multiply: "×",
    divide: "÷",
  }[expression.operator];
  const left = expressionText(expression.left);
  const right = expressionText(expression.right);
  const nestedRight =
    expression.right.kind === "operation" ? `(${right})` : right;
  return `${left} ${operator} ${nestedRight}`;
}

export function equationText(equation: MathematicalEquation): string {
  return `${expressionText(equation.left)} = ${expressionText(equation.right)}`;
}

export function EquationRenderer({
  data,
  className,
}: {
  data: MathematicalEquationStructuredData;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-workspace-border bg-code-background p-5",
        className,
      )}
    >
      <div className="space-y-3" role="list" aria-label="Equation system">
        {data.equations.map((equation, index) => (
          <div
            className="rounded-md bg-surface-lowest px-4 py-3 text-center font-mono text-xl font-semibold text-code-foreground"
            key={`${equationText(equation)}-${index}`}
            role="listitem"
          >
            {equationText(equation)}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Each letter is an integer from {data.domain.minimum} to {data.domain.maximum}.
      </p>
    </div>
  );
}

