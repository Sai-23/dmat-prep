import { createFingerprint } from "../fingerprint";
import type { JsonValue } from "../types";
import type { LatinSquareCandidate, LatinSymbol } from "./types";

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

