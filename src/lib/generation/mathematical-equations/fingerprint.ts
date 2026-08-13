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
  includeConstants = true,
  preserveStructuralConstant = false,
): unknown {
  if (expression.kind === "constant") {
    return ["constant", includeConstants || preserveStructuralConstant ? expression.value : "K"];
  }
  if (expression.kind === "variable") return ["variable", symbols.get(expression.symbol)];
  const coefficientContext = !includeConstants &&
    (expression.operator === "multiply" || expression.operator === "divide");
  const operands = [
    normalizeExpression(expression.left, symbols, includeConstants, coefficientContext),
    normalizeExpression(expression.right, symbols, includeConstants, coefficientContext),
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

export function mathematicalEquationStructuralValue(
  candidate: MathematicalEquationCandidate,
): { equations: unknown[]; dependencyGraph: unknown[]; solvePath: unknown[] } {
  const variants = permutations(candidate.structuredData.variables).map((order) => {
    const symbols = new Map(order.map((symbol, index) => [symbol, `V${index}`]));
    const normalizedByIndex = candidate.structuredData.equations.map((equation) => {
      const sides = [
        normalizeExpression(equation.left, symbols),
        normalizeExpression(equation.right, symbols),
      ].sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
      return sides;
    });
    const equations = [...normalizedByIndex];
    equations.sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
    const dependencyGraph = candidate.structuredData.dependencyModel.edges
      .map((edge) => [symbols.get(edge.source), symbols.get(edge.target)])
      .sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
    const solvePath = candidate.solutionPath.map((step) => {
      const equationShapes = [step.equationIndex, ...(step.supportingEquationIndices ?? [])]
        .map((index) => normalizedByIndex[index])
        .filter(Boolean)
        .sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
      return {
        target: symbols.get(step.targetSymbol),
        known: step.knownSymbols.map((symbol) => symbols.get(symbol)).sort(),
        dependencies: (step.dependencySymbols ?? []).map((symbol) => symbols.get(symbol)).sort(),
        reasoning: step.reasoning ?? "solve_variable",
        equations: equationShapes,
      };
    });
    return { equations, dependencyGraph, solvePath };
  });
  variants.sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
  return variants[0];
}

export function mathematicalEquationStructuralSignature(
  candidate: MathematicalEquationCandidate,
): string {
  return createFingerprint(
    "mathematical-equation-structure",
    mathematicalEquationStructuralValue(candidate) as never,
  );
}

export function fingerprintMathematicalEquation(
  candidate: MathematicalEquationCandidate,
): string {
  return createFingerprint(
    "mathematical-equation",
    mathematicalEquationSemanticValue(candidate) as never,
  );
}
