import { z } from "zod";

import { GENERATION_DIFFICULTIES } from "../types";
import { COMPUTER_SCIENCE_UNIT_SCHEMA_VERSION } from "./types";

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const computerSciencePresentationBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().trim().min(1) }),
  z.object({ kind: z.literal("code"), code: z.string().trim().min(1), language: z.string().trim().min(1).optional() }),
  z.object({ kind: z.literal("formula"), expression: z.string().trim().min(1) }),
  z.object({ kind: z.literal("table"), data: jsonValueSchema }),
  z.object({ kind: z.literal("diagram"), data: jsonValueSchema }),
]);

const optionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  content: jsonValueSchema.refine(
    (value) => typeof value !== "string" || value.trim().length > 0,
    "Option content cannot be an empty string.",
  ),
});

const questionSchema = z.object({
  id: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  subtopic: z.string().trim().min(1).optional(),
  difficulty: z.enum(GENERATION_DIFFICULTIES),
  prompt: z.string().trim().min(1),
  blocks: z.array(computerSciencePresentationBlockSchema),
  options: z.tuple([optionSchema, optionSchema, optionSchema, optionSchema]),
  correctOptionId: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  estimatedSolveTimeSeconds: z.number().int().positive(),
});

export const computerScienceSubjectUnitSchema = z.object({
  schemaVersion: z.literal(COMPUTER_SCIENCE_UNIT_SCHEMA_VERSION),
  module: z.literal("computer_science"),
  subject: z.literal("computer_science"),
  topic: z.string().trim().min(1),
  stimulus: z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    blocks: z.array(computerSciencePresentationBlockSchema).min(1),
  }),
  questions: z.array(questionSchema).min(1),
});
