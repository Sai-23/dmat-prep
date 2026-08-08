import type { ValidationCheck, ValidationIssue, ValidationResult } from "../types";
import { computerScienceSubjectUnitSchema } from "./schema";
import {
  COMPUTER_SCIENCE_ARCHITECTURE_VALIDATOR_VERSION,
  type ComputerScienceSubjectUnit,
  type ComputerScienceUnitValidationSolution,
} from "./types";

function check(stage: ValidationCheck["stage"], passed: boolean, details?: ValidationCheck["details"]): ValidationCheck {
  return { stage, passed, validatorVersion: COMPUTER_SCIENCE_ARCHITECTURE_VALIDATOR_VERSION, ...(details === undefined ? {} : { details }) };
}

function invalid(stage: ValidationIssue["stage"], code: string, message: string, checks: ValidationCheck[]): ValidationResult<ComputerScienceUnitValidationSolution> {
  const issue: ValidationIssue = { stage, code, message };
  return { valid: false, issues: [issue], checks };
}

export function validateComputerScienceSubjectUnit(
  input: ComputerScienceSubjectUnit,
): ValidationResult<ComputerScienceUnitValidationSolution> {
  const checks: ValidationCheck[] = [];
  const parsed = computerScienceSubjectUnitSchema.safeParse(input);
  checks.push(check("format", parsed.success));
  if (!parsed.success) {
    return invalid("format", "invalid_subject_unit_schema", parsed.error.issues[0]?.message ?? "The subject unit is malformed.", checks);
  }

  const questionIds = parsed.data.questions.map((question) => question.id);
  const questionIdsUnique = new Set(questionIds).size === questionIds.length;
  const answersValid = parsed.data.questions.every((question) => {
    const optionIds = question.options.map((option) => option.id);
    const optionLabels = question.options.map((option) => option.label);
    return new Set(optionIds).size === 4 && new Set(optionLabels).size === 4 && optionIds.filter((id) => id === question.correctOptionId).length === 1;
  });
  const domainValid = questionIdsUnique && answersValid;
  checks.push(check("domain", domainValid, { questionCount: parsed.data.questions.length }));
  checks.push(check("uniqueness", answersValid));
  if (!domainValid) {
    return invalid("domain", "invalid_subject_unit_answers", "Question identities and option labels must be unique, with exactly one stored correct option per question.", checks);
  }

  return {
    valid: true,
    solution: {
      questionCount: parsed.data.questions.length,
      correctOptionIds: parsed.data.questions.map((question) => question.correctOptionId),
    },
    checks,
  };
}
