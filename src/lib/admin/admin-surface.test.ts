import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { adminNavigation, navigationForRoles } from "@/lib/constants/navigation";
import { ADMIN_CORE_QUESTION_TYPE_OPTIONS } from "./core-options";
import { canAccessPrivateQuestionBank, canMakeReviewDecision, canManageQuestionLifecycle } from "./publishing-policy";
import { questionAuthoringSchema } from "./schemas";

const adminRoots = [join(process.cwd(), "src", "app", "admin"), join(process.cwd(), "src", "components", "admin")];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Core-only Admin surface", () => {
  it("contains no retired subject-module, provider, critic, or benchmark UI copy", () => {
    const source = adminRoots.flatMap(sourceFiles).map((path) => readFileSync(path, "utf8")).join("\n").toLowerCase();
    [
      "computer_science",
      "computer science",
      "subjecttestlet",
      "subject_testlet",
      "openrouter",
      "nvidia",
      "gemini",
      "ai critic",
      "ai generator",
      "cs35",
      "cs37",
      "cs38",
    ].forEach((term) => expect(source).not.toContain(term));
  });

  it("offers exactly the three Core question types", () => {
    expect(ADMIN_CORE_QUESTION_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "figure_sequence",
      "mathematical_equation",
      "latin_square",
    ]);
  });

  it("keeps retired Admin route trees absent", () => {
    ["computer-science", "cs", "ai", "testlets"].forEach((route) => {
      expect(existsSync(join(process.cwd(), "src", "app", "admin", route))).toBe(false);
    });
  });

  it("rejects a retired question type at the authoring boundary", () => {
    const result = questionAuthoringSchema.safeParse({
      module: "core",
      questionType: "computer_science",
      subject: "",
      topic: "Legacy topic",
      subtopic: "",
      difficulty: "easy",
      questionText: "This legacy payload must not enter the Core question bank.",
      passage: "",
      code: "",
      formula: "",
      structuredData: "",
      imageUrl: "",
      explanation: "The live authoring schema supports only the three Core types.",
      estimatedTimeSeconds: 60,
      sourceType: "manual",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
      intent: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("preserves Admin and reviewer authorization boundaries", () => {
    expect(navigationForRoles(adminNavigation, ["student"])).toEqual([]);
    expect(canAccessPrivateQuestionBank(["student"])).toBe(false);
    expect(canAccessPrivateQuestionBank(["reviewer"])).toBe(true);
    expect(canMakeReviewDecision(["reviewer"])).toBe(true);
    expect(canManageQuestionLifecycle(["reviewer"])).toBe(false);
    expect(canManageQuestionLifecycle(["admin"])).toBe(true);
  });
});
