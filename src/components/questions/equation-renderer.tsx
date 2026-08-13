import type {
  MathematicalEquation,
  MathematicalEquationStructuredData,
  MathematicalExpression,
} from "@/lib/generation/mathematical-equations";
import { cn } from "@/lib/utils";

function precedence(expression: MathematicalExpression): number {
  if (expression.kind !== "operation") return 3;
  return expression.operator === "multiply" || expression.operator === "divide" ? 2 : 1;
}

function expressionText(
  expression: MathematicalExpression,
  parentPrecedence = 0,
  isRight = false,
): string {
  if (expression.kind === "constant") return String(expression.value);
  if (expression.kind === "variable") return expression.symbol;
  const operator = {
    add: "+",
    subtract: "−",
    multiply: "×",
    divide: "÷",
  }[expression.operator];
  const currentPrecedence = precedence(expression);
  const left = expressionText(expression.left, currentPrecedence);
  const right = expressionText(expression.right, currentPrecedence, true);
  const text = `${left} ${operator} ${right}`;
  const needsParentheses = currentPrecedence < parentPrecedence ||
    (isRight && currentPrecedence === parentPrecedence &&
      (expression.operator === "subtract" || expression.operator === "divide"));
  return needsParentheses ? `(${text})` : text;
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
