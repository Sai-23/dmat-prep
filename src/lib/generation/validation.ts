import type { ValidationIssue, ValidationResult } from "./types";

export const GENERATION_ACCEPTANCE_STAGES = [
  "solve",
  "format",
  "domain",
  "uniqueness",
  "safety",
  "explanation",
  "difficulty",
  "duplicate",
] as const;

export function invalidValidationResult(
  issues: readonly ValidationIssue[],
  checks: ValidationResult["checks"] = [],
): ValidationResult {
  if (issues.length === 0) {
    throw new Error("An invalid validation result requires at least one issue.");
  }
  return { valid: false, issues: [...issues], checks: [...checks] };
}

