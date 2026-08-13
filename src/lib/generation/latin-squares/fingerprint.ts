import { createFingerprint } from "../fingerprint";
import type { JsonValue } from "../types";
import { analyzeLatinDeductions } from "./difficulty";
import type {
  LatinDeductionAnalysis,
  LatinSquareCandidate,
  LatinSymbol,
} from "./types";

export function latinSquareSemanticValue(candidate: LatinSquareCandidate): JsonValue {
  const symbolMap = new Map<LatinSymbol, string>();
  const normalizedSymbol = (symbol: LatinSymbol): string => {
    if (!symbolMap.has(symbol)) symbolMap.set(symbol, `S${symbolMap.size}`);
    return symbolMap.get(symbol) as string;
  };
  const grid = candidate.structuredData.grid.map((row) =>
    row.map((symbol) => (symbol === null ? null : normalizedSymbol(symbol))),
  );
  const answer = normalizedSymbol(candidate.correctAnswer);
  return {
    size: candidate.structuredData.size,
    target: candidate.structuredData.target,
    grid,
    answer,
  };
}

export function fingerprintLatinSquare(candidate: LatinSquareCandidate): string {
  return createFingerprint("latin-square", latinSquareSemanticValue(candidate));
}

/**
 * Groups puzzles by clue geometry and deduction shape while ignoring arbitrary
 * A-E relabeling. This is intentionally separate from the semantic fingerprint:
 * the generation pipeline rejects exact semantic duplicates, while audits use
 * this coarser signature to measure structural variety.
 */
export function latinSquareStructuralSignature(
  candidate: LatinSquareCandidate,
  analysis: LatinDeductionAnalysis = analyzeLatinDeductions(candidate),
): string {
  const clueMask = candidate.structuredData.grid.map((row) =>
    row.map((symbol) => symbol !== null),
  );
  const deductionShape = analysis.deductions.map((deduction) => ({
    coordinate: deduction.coordinate,
    reason: deduction.reason,
    round: deduction.round,
    depth: deduction.depth,
    dependencies: deduction.dependencies,
  }));
  return createFingerprint("latin-square-structure", {
    target: candidate.structuredData.target,
    clueMask,
    targetInitialCandidateCount: analysis.targetInitialCandidateCount,
    deductionShape,
  });
}
