import { canonicalize, createFingerprint } from "../fingerprint";
import type {
  MathematicalEquationCandidate,
  MathematicalExpression,
} from "./types";

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [ [...values] ];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]),
  );
}

function normalizeExpression(
  expression: MathematicalExpression,
  symbols: ReadonlyMap<string, string>,
): unknown {
  if (expression.kind === "constant") return ["constant", expression.value];
  if (expression.kind === "variable") return ["variable", symbols.get(expression.symbol)];
  const operands = [
    normalizeExpression(expression.left, symbols),
    normalizeExpression(expression.right, symbols),
  ];
  if (expression.operator === "add" || expression.operator === "multiply") {
    operands.sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
  }
  return [expression.operator, ...operands];
}

export function mathematicalEquationSemanticValue(
  candidate: MathematicalEquationCandidate,
): { domain: MathematicalEquationCandidate["structuredData"]["domain"]; equations: unknown[] } {
  const variants = permutations(candidate.structuredData.variables).map((order) => {
    const symbols = new Map(order.map((symbol, index) => [symbol, `V${index}`]));
    const equations = candidate.structuredData.equations.map((equation) => {
      const sides = [
        normalizeExpression(equation.left, symbols),
        normalizeExpression(equation.right, symbols),
      ].sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
      return sides;
    });
    equations.sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
    return equations;
  });
  variants.sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
  return { domain: candidate.structuredData.domain, equations: variants[0] };
}

export function fingerprintMathematicalEquation(
  candidate: MathematicalEquationCandidate,
): string {
  return createFingerprint(
    "mathematical-equation",
    mathematicalEquationSemanticValue(candidate) as never,
  );
}

