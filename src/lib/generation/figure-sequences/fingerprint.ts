import { createFingerprint } from "../fingerprint";
import { visibleFrameValue } from "./distractors";
import type { FigureSequenceCandidate, FigureSymbolRuleSet } from "./types";

export function figureStructuralSignature(candidate: FigureSequenceCandidate): string {
  const ruleStreams = candidate.structuredData.rules.map((rule) => ({
    movement: rule.movement ?? null,
    rotation: rule.rotation ?? null,
    colour: rule.colour ?? null,
  }));
  return createFingerprint("figure-sequence-structure", {
    symbolCount: candidate.structuredData.visibleFrames[0]?.symbols.length ?? 0,
    predictionDepth: candidate.solutionFrames.length,
    ruleStreams: ruleStreams.sort((first, second) =>
      JSON.stringify(first).localeCompare(JSON.stringify(second)),
    ),
  });
}

export function fingerprintFigureSequence(candidate: FigureSequenceCandidate): string {
  const initial = candidate.structuredData.visibleFrames[0];
  const ids = [...initial.symbols].sort((a, b) => a.id.localeCompare(b.id)).map((symbol) => symbol.id);
  const idMap = new Map(ids.map((id, index) => [id, `symbol-${index}`]));
  const normalizedRules = candidate.structuredData.rules
    .map((rule): FigureSymbolRuleSet => ({ ...structuredClone(rule), symbolId: idMap.get(rule.symbolId) ?? rule.symbolId }))
    .sort((a, b) => a.symbolId.localeCompare(b.symbolId));
  const normalizedInitial = structuredClone(initial);
  normalizedInitial.symbols = normalizedInitial.symbols.map((symbol) => ({ ...symbol, id: idMap.get(symbol.id) ?? symbol.id }));
  return createFingerprint("figure-sequence", {
    grid: candidate.structuredData.grid,
    initialFrame: JSON.parse(visibleFrameValue(normalizedInitial)),
    rules: normalizedRules,
  });
}
