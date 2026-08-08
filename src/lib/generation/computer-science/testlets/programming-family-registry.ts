import type { GenerationDifficulty } from "../../types";
import type { TestletReasoningRole, VerificationClass } from "./types";

export const PROGRAMMING_TOPICS = ["variables", "loops", "arrays", "functions", "recursion", "time_complexity", "basic_oop"] as const;
export type ProgrammingTopic = (typeof PROGRAMMING_TOPICS)[number];

export type ProgrammingFamilyDefinition = {
  id: string;
  topic: ProgrammingTopic;
  reasoningRole: TestletReasoningRole;
  verificationClass: VerificationClass;
  difficulties: readonly GenerationDifficulty[];
};

export const PROGRAMMING_FAMILY_REGISTRY = [
  { id: "final_return_value", topic: "functions", reasoningRole: "output_prediction", verificationClass: "A", difficulties: ["easy", "medium", "hard"] },
  { id: "array_mutation_trace", topic: "arrays", reasoningRole: "state_prediction", verificationClass: "A", difficulties: ["easy", "medium", "hard"] },
  { id: "branch_execution_count", topic: "loops", reasoningRole: "calculation", verificationClass: "A", difficulties: ["easy", "medium", "hard"] },
  { id: "indexed_final_state", topic: "arrays", reasoningRole: "direct_application", verificationClass: "A", difficulties: ["easy", "medium", "hard"] },
  { id: "intermediate_accumulator", topic: "variables", reasoningRole: "tracing", verificationClass: "A", difficulties: ["medium", "hard"] },
  { id: "off_by_one_consequence", topic: "loops", reasoningRole: "error_detection", verificationClass: "A", difficulties: ["medium", "hard"] },
  { id: "result_summary_pair", topic: "functions", reasoningRole: "alternative_representation", verificationClass: "A", difficulties: ["hard"] },
  { id: "loop_condition_complexity", topic: "time_complexity", reasoningRole: "complexity_reasoning", verificationClass: "A", difficulties: ["hard"] },
] as const satisfies readonly ProgrammingFamilyDefinition[];

export function getProgrammingFamily(id: string): ProgrammingFamilyDefinition | undefined {
  return PROGRAMMING_FAMILY_REGISTRY.find((family) => family.id === id);
}

export function validateProgrammingComposition(families: readonly string[]): string[] {
  const issues: string[] = [];
  const known = families.map(getProgrammingFamily);
  if (known.some((family) => !family)) issues.push("unknown_programming_family");
  const required = families.length >= 6 ? 4 : 3;
  if (new Set(families).size < required) issues.push("insufficient_family_diversity");
  if (known.filter(Boolean).some((family, index, values) => values.filter((candidate) => candidate?.reasoningRole === family?.reasoningRole).length > Math.ceil(families.length / 2))) issues.push("reasoning_role_dominance");
  return issues;
}
