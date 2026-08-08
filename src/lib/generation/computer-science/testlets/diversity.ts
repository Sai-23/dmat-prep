import { createFingerprint } from "../../fingerprint";
import type { JsonValue } from "../../types";
import type { SubjectTestlet, SubjectTestletQuestion } from "./types";

export type ProgrammingStructuralShape = {
  topic: string;
  structure: string;
  controlFlow: string[];
  dataFlow: string[];
  composition: string[];
  roleSequence: string[];
  derivations: string[];
  stimulusKinds: string[];
};

function record(value: JsonValue): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function codeFeatures(testlet: SubjectTestlet): string[] {
  const code = testlet.stimulus.blocks.filter((block) => "code" in block).map((block) => "code" in block ? block.code : "").join("\n").toLowerCase();
  return ["for", "while", "if", "else", "break", "step", "return", "swap", "inherits", "override", "private", "recursive", "two_calls"].filter((feature) => feature === "recursive" ? /\w+\([^)]*\)[\s\S]*(return|\+)/.test(code) : feature === "two_calls" ? (code.match(/\w+\([^)]*\)/g)?.length ?? 0) > 3 : code.includes(feature));
}

export function questionDerivationSignature(question: SubjectTestletQuestion): string {
  const semantic = record(question.semanticParameters);
  const task = typeof semantic.task === "string" ? semantic.task : typeof semantic.family === "string" ? semantic.family : question.family;
  const modifiers = Object.keys(semantic).filter((key) => !["expected", "selectedIndex", "prefixLength"].includes(key)).sort();
  return `${question.family}|${question.reasoningRole}|${task}|${modifiers.join("+")}`;
}

export function programmingStructuralShape(testlet: SubjectTestlet): ProgrammingStructuralShape {
  const semantic = record(testlet.metadata.semanticParameters);
  const values = Array.isArray(semantic.values) ? semantic.values : [];
  const structure = typeof semantic.structure === "string" ? semantic.structure : `${testlet.topic}:${testlet.subtopic}`;
  const dataFlow = [
    values.length ? `collection:${values.length}` : "scalar",
    typeof semantic.stopAfter === "number" ? "early_limit" : "no_limit",
    typeof semantic.calls === "number" ? "method_sequence" : "no_method_sequence",
    Array.isArray(semantic.values) ? "indexed_state" : "object_or_scalar_state",
  ];
  return {
    topic: testlet.topic,
    structure,
    controlFlow: codeFeatures(testlet),
    dataFlow,
    composition: testlet.questions.map((question) => question.family),
    roleSequence: testlet.questions.map((question) => question.reasoningRole),
    derivations: testlet.questions.map(questionDerivationSignature),
    stimulusKinds: testlet.stimulus.blocks.map((block) => block.kind),
  };
}

export function structuralFingerprintSubjectTestlet(testlet: SubjectTestlet): string {
  return createFingerprint("computer-science-structural", programmingStructuralShape(testlet));
}

export function semanticFingerprintSubjectTestlet(testlet: SubjectTestlet): string {
  return createFingerprint("computer-science-semantic", programmingStructuralShape(testlet));
}

function jaccard(first: readonly string[], second: readonly string[]): number {
  const a = new Set(first); const b = new Set(second); const union = new Set([...a, ...b]);
  return union.size ? [...a].filter((value) => b.has(value)).length / union.size : 1;
}

export function testletStructuralSimilarity(first: SubjectTestlet, second: SubjectTestlet): number {
  const a = programmingStructuralShape(first); const b = programmingStructuralShape(second);
  const sameStructure = a.structure === b.structure ? 1 : 0;
  const sameTopic = a.topic === b.topic ? 1 : 0;
  const composition = jaccard(a.composition.map((family, index) => `${index}:${family}`), b.composition.map((family, index) => `${index}:${family}`));
  const derivation = jaccard(a.derivations, b.derivations);
  const representation = jaccard(a.stimulusKinds, b.stimulusKinds);
  const flow = jaccard([...a.controlFlow, ...a.dataFlow], [...b.controlFlow, ...b.dataFlow]);
  return Number((sameStructure * 0.28 + sameTopic * 0.12 + composition * 0.2 + derivation * 0.2 + representation * 0.08 + flow * 0.12).toFixed(4));
}

export function nearestStructuralNeighbor(testlet: SubjectTestlet, candidates: readonly SubjectTestlet[]): { id: string | null; similarity: number } {
  const scored = candidates.filter((candidate) => candidate.id !== testlet.id).map((candidate) => ({ id: candidate.id, similarity: testletStructuralSimilarity(testlet, candidate) })).sort((a, b) => b.similarity - a.similarity);
  return scored[0] ?? { id: null, similarity: 0 };
}

export function areStructuralDuplicates(first: SubjectTestlet, second: SubjectTestlet): boolean {
  return structuralFingerprintSubjectTestlet(first) === structuralFingerprintSubjectTestlet(second);
}
