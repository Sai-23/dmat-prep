import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import {
  MATHEMATICAL_EQUATION_DOMAIN,
  MATHEMATICAL_EQUATION_GENERATOR_VERSION,
  type MathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalEquationGenerationConfiguration,
  type MathematicalExpression,
  type VariableAssignment,
} from "./types";

const VARIABLE_COUNTS = { easy: 2, medium: 3, hard: 4 } as const;
const ESTIMATED_SECONDS = { easy: 55, medium: 75, hard: 100 } as const;
const SYMBOLS = ["A", "B", "C", "D"] as const;

function constant(value: number): MathematicalExpression {
  return { kind: "constant", value };
}

function variable(symbol: string): MathematicalExpression {
  return { kind: "variable", symbol };
}

function operation(
  operator: "add" | "subtract" | "multiply" | "divide",
  left: MathematicalExpression,
  right: MathematicalExpression,
): MathematicalExpression {
  return { kind: "operation", operator, left, right };
}

function renderExpression(expression: MathematicalExpression): string {
  if (expression.kind === "constant") return String(expression.value);
  if (expression.kind === "variable") return expression.symbol;
  const operators = { add: "+", subtract: "-", multiply: "×", divide: "÷" };
  return `${renderExpression(expression.left)} ${operators[expression.operator]} ${renderExpression(expression.right)}`;
}

function renderEquation(equation: MathematicalEquation): string {
  return `${renderExpression(equation.left)} = ${renderExpression(equation.right)}`;
}

function createAnchor(
  symbol: string,
  value: number,
  random: SeededRandom,
): MathematicalEquation {
  const choices: MathematicalEquation[] = [];
  const offset = random.integer(2, 8);
  choices.push({
    left: operation("add", variable(symbol), constant(offset)),
    right: constant(value + offset),
  });

  if (value > offset) {
    choices.push({
      left: operation("subtract", variable(symbol), constant(offset)),
      right: constant(value - offset),
    });
  }
  for (const factor of [2, 3]) {
    if (value * factor <= 40) {
      choices.push({
        left: operation("multiply", constant(factor), variable(symbol)),
        right: constant(value * factor),
      });
    }
  }
  return random.pick(choices);
}

function createDependency(
  sourceSymbol: string,
  sourceValue: number,
  targetSymbol: string,
  targetValue: number,
  random: SeededRandom,
): MathematicalEquation {
  const choices: MathematicalEquation[] = [];
  const difference = Math.abs(targetValue - sourceValue);

  if (targetValue > sourceValue) {
    choices.push({
      left: variable(targetSymbol),
      right: operation("add", variable(sourceSymbol), constant(difference)),
    });
    choices.push({
      left: operation("subtract", variable(targetSymbol), constant(difference)),
      right: variable(sourceSymbol),
    });
  } else {
    choices.push({
      left: variable(targetSymbol),
      right: operation("subtract", variable(sourceSymbol), constant(difference)),
    });
    choices.push({
      left: operation("add", variable(targetSymbol), constant(difference)),
      right: variable(sourceSymbol),
    });
  }

  if (targetValue % sourceValue === 0) {
    const factor = targetValue / sourceValue;
    if (factor >= 2 && factor <= 5) {
      choices.push({
        left: variable(targetSymbol),
        right: operation("multiply", constant(factor), variable(sourceSymbol)),
      });
    }
  }
  if (sourceValue % targetValue === 0) {
    const divisor = sourceValue / targetValue;
    if (divisor >= 2 && divisor <= 5) {
      choices.push({
        left: variable(targetSymbol),
        right: operation("divide", variable(sourceSymbol), constant(divisor)),
      });
    }
  }

  return random.pick(choices);
}

function createRandom(configuration: MathematicalEquationGenerationConfiguration, attempt: number) {
  if (!configuration.seed.trim()) {
    throw new Error("A non-empty mathematical-equation seed is required.");
  }
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new RangeError("Generation attempt must be a positive safe integer.");
  }
  const options = canonicalize(configuration.options ?? {});
  return new SeededRandom(
    `${MATHEMATICAL_EQUATION_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${options}\u001f${attempt}`,
  );
}

export class MathematicalEquationGenerator
  implements
    QuestionGenerator<
      MathematicalEquationGenerationConfiguration,
      MathematicalEquationCandidate
    >
{
  readonly questionType = "mathematical_equation" as const;
  readonly version = MATHEMATICAL_EQUATION_GENERATOR_VERSION;

  generate(
    configuration: MathematicalEquationGenerationConfiguration,
    attempt: number,
  ): MathematicalEquationCandidate {
    const random = createRandom(configuration, attempt);
    const variableCount = VARIABLE_COUNTS[configuration.difficulty];
    const variables = random.shuffle(SYMBOLS.slice(0, variableCount));
    const values = random
      .shuffle(
        Array.from(
          { length: MATHEMATICAL_EQUATION_DOMAIN.maximum },
          (_, index) => index + MATHEMATICAL_EQUATION_DOMAIN.minimum,
        ),
      )
      .slice(0, variableCount);
    const assignment: VariableAssignment = Object.fromEntries(
      variables.map((symbol, index) => [symbol, values[index]]),
    );

    const solutionOrder = [...variables];
    const equations: MathematicalEquation[] = [
      createAnchor(solutionOrder[0], assignment[solutionOrder[0]], random),
    ];
    for (let index = 1; index < solutionOrder.length; index += 1) {
      const source = solutionOrder[index - 1];
      const target = solutionOrder[index];
      equations.push(
        createDependency(
          source,
          assignment[source],
          target,
          assignment[target],
          random,
        ),
      );
    }

    const displayedEquations = random.shuffle(equations);
    const solutionPath = equations.map((equation, index) => ({
      equationIndex: displayedEquations.indexOf(equation),
      targetSymbol: solutionOrder[index],
      knownSymbols: solutionOrder.slice(0, index),
    }));
    const explanationSteps = equations.map(
      (equation, index) =>
        `${index + 1}. Use ${renderEquation(equation)} to obtain ${solutionOrder[index]} = ${assignment[solutionOrder[index]]}.`,
    );

    return {
      questionType: "mathematical_equation",
      module: "core",
      topic: "Mathematical Equations",
      subtopic: "Integer equation systems",
      presentation: {
        prompt: "Find the integer value of every letter so that all equations are true.",
        blocks: displayedEquations.map((equation) => ({
          kind: "formula" as const,
          expression: renderEquation(equation),
        })),
      },
      structuredData: {
        variables: [...SYMBOLS.slice(0, variableCount)],
        equations: displayedEquations,
        domain: { ...MATHEMATICAL_EQUATION_DOMAIN, integersOnly: true },
      },
      response: {
        kind: "symbol_assignment",
        symbols: [...SYMBOLS.slice(0, variableCount)],
      },
      correctAnswer: Object.fromEntries(
        [...SYMBOLS.slice(0, variableCount)].map((symbol) => [symbol, assignment[symbol]]),
      ),
      explanation: explanationSteps.join("\n"),
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
      solutionPath,
    };
  }
}

export const mathematicalEquationGenerator = new MathematicalEquationGenerator();
