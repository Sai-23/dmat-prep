import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  generateValidatedFigureSequence,
  generateValidatedLatinSquare,
  generateValidatedMathematicalEquation,
} from "@/lib/generation";
import { canDeleteQuestions, evaluatePublication } from "./publishing-policy";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("generated-question auto-publication", () => {
  it("accepts fully validated output from every Core generator", () => {
    const equation = generateValidatedMathematicalEquation({ seed: "workflow-equation", difficulty: "easy" });
    const latin = generateValidatedLatinSquare({ seed: "workflow-latin", difficulty: "easy" });
    const figure = generateValidatedFigureSequence({ seed: "workflow-figure", difficulty: "easy" });
    const candidates = [
      {
        questionType: equation.questionType,
        structuredData: { response: equation.response },
        metadata: { generation: equation.metadata, validation: equation.validation },
      },
      {
        questionType: latin.questionType,
        structuredData: { response: latin.response },
        metadata: { generation: latin.metadata, validation: latin.validation },
      },
      {
        questionType: figure.questionType,
        structuredData: { response: figure.response },
        metadata: { generation: figure.metadata, validation: figure.validation },
      },
    ];

    for (const candidate of candidates) {
      expect(evaluatePublication({
        verificationStatus: "approved",
        sourceType: "generated",
        optionCount: 0,
        correctOptionId: null,
        ...candidate,
      })).toEqual({ allowed: true });
    }
  });

  it("rejects a generated candidate when a deterministic check fails", () => {
    expect(evaluatePublication({
      verificationStatus: "approved",
      questionType: "mathematical_equation",
      sourceType: "generated",
      optionCount: 0,
      correctOptionId: null,
      structuredData: { response: { kind: "symbol_assignment" } },
      metadata: {
        generation: { seed: "seed", generatorVersion: "g", validatorVersion: "v", fingerprint: "fingerprint" },
        validation: { valid: false, checks: [{ passed: false }] },
      },
    }).allowed).toBe(false);
  });

  it("persists new generated questions directly as approved and published", () => {
    const data = source("src/lib/admin/data.ts");
    expect(data).toContain('export async function createPublishedGeneratedEquation');
    expect(data).toContain('export async function createPublishedGeneratedLatin');
    expect(data).toContain('export async function createPublishedGeneratedFigure');
    expect(data.match(/verification_status: "approved"/g)).toHaveLength(3);
    expect(data.match(/publication_status: "published"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(data.match(/published_at: publishedAt/g)).toHaveLength(3);
    expect(data).not.toContain("createGeneratedEquationDraft");
  });
});

describe("question soft deletion", () => {
  it("is server-authorized for admins and safe on repeated requests", () => {
    expect(canDeleteQuestions(["student"])).toBe(false);
    expect(canDeleteQuestions(["reviewer"])).toBe(false);
    expect(canDeleteQuestions(["admin"])).toBe(true);
    const actions = source("src/app/admin/actions.ts");
    const data = source("src/lib/admin/data.ts");
    expect(actions).toMatch(/deleteQuestionAction[\s\S]*requireRole\(\["admin"\]\)/);
    expect(data).toContain('if (question.deleted_at) return { status: "already_deleted" }');
    expect(data).toContain('return { status: "already_deleted" }');
  });

  it("excludes deleted questions from every active bank, Practice, and Mock query", () => {
    [
      "src/lib/admin/data.ts",
      "src/lib/admin/test-data.ts",
      "src/lib/practice/data.ts",
      "src/lib/learning/data.ts",
      "src/lib/tests/data.ts",
    ].forEach((path) => expect(source(path)).toContain('.is("deleted_at", null)'));
  });

  it("uses a confirmation dialog and preserves immutable attempt data", () => {
    const bank = source("src/components/admin/review-queue.tsx");
    const migration = source("supabase/migrations/202608100014_question_soft_delete.sql");
    expect(bank).toContain('title="Delete this question?"');
    expect(bank).toContain("Existing attempts remain available through their immutable snapshots.");
    expect(migration).toContain("add column if not exists deleted_at");
    expect(migration).toContain("drop policy if exists questions_delete");
    expect(migration.toLowerCase()).not.toContain("cascade");
  });
});
