import { z } from "zod";

import { MODULES } from "../../types/questions";

export const TEST_TYPES = [
  "diagnostic",
  "mini_mock",
  "full_mock",
  "sectional",
] as const;

const nullableModule = z
  .union([z.enum(MODULES), z.literal(""), z.null()])
  .transform((value) => value || null);

const testSectionSchema = z.object({
  title: z.string().trim().min(2, "Enter a section title.").max(120),
  module: nullableModule,
  sectionType: z.enum(["figure_sequence", "mathematical_equation", "latin_square", "mixed"]),
  durationSeconds: z.coerce.number().int().min(60).max(14_400),
  questionIds: z.array(z.string().uuid()).min(1).max(100),
});

export const adminTestBuilderSchema = z
  .object({
    title: z.string().trim().min(3, "Enter a test title.").max(160),
    description: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((value) => value || null),
    testType: z.enum(TEST_TYPES),
    module: nullableModule,
    instructions: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .transform((value) => value || null),
    isPremium: z.boolean(),
    randomizeQuestions: z.boolean(),
    randomizeOptions: z.boolean(),
    intent: z.enum(["draft", "publish"]),
    sections: z.array(testSectionSchema).min(1).max(10),
  })
  .superRefine((value, context) => {
    const questionIds = value.sections.flatMap((section) => section.questionIds);
    if (questionIds.length > 200) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "A test can contain at most 200 questions.",
      });
    }
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "A question can only appear once in a test.",
      });
    }
    value.sections.forEach((section, index) => {
      if (value.module && section.module && section.module !== value.module) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "module"],
          message: "The section module must match the test module.",
        });
      }
    });
  });

export const adminTestIdSchema = z.string().uuid();

export const adminTestLifecycleSchema = z.object({
  testId: adminTestIdSchema,
  action: z.enum(["publish", "unpublish"]),
});

export type AdminTestBuilderInput = z.infer<typeof adminTestBuilderSchema>;

export type AdminQuestionBankItem = {
  id: string;
  module: "core";
  questionType:
    | "figure_sequence"
    | "mathematical_equation"
    | "latin_square";
  topic: string;
  subtopic: string | null;
  difficulty: "easy" | "medium" | "hard";
  questionText: string;
  estimatedTimeSeconds: number;
};

export type EditableAdminTest = {
  id: string;
  title: string;
  description: string | null;
  testType: (typeof TEST_TYPES)[number];
  module: "core" | null;
  instructions: string | null;
  isPremium: boolean;
  isPublished: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  sections: Array<{
    title: string;
    sectionType: "figure_sequence" | "mathematical_equation" | "latin_square" | "mixed";
    module: "core" | null;
    durationSeconds: number;
    questionIds: string[];
  }>;
};

export type AdminTestListItem = {
  id: string;
  title: string;
  testType: (typeof TEST_TYPES)[number];
  module: "core" | null;
  durationSeconds: number;
  isPremium: boolean;
  isPublished: boolean;
  sectionCount: number;
  questionCount: number;
  attemptCount: number;
  updatedAt: string;
};
