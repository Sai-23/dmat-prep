import { z } from "zod";

export const MODULES = ["core"] as const;
export const QUESTION_TYPES = [
  "figure_sequence",
  "mathematical_equation",
  "latin_square",
] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const SOURCE_TYPES = ["manual", "generated", "imported"] as const;
export const VERIFICATION_STATUSES = [
  "draft",
  "under_review",
  "approved",
  "rejected",
] as const;
export const PUBLICATION_STATUSES = [
  "draft",
  "published",
  "flagged",
  "retired",
] as const;

export const figureObjectSchema = z.object({
  shape: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  size: z.number().positive(),
  fill: z.enum(["solid", "outline"]),
  color: z.string().optional(),
  layer: z.number().int().optional(),
});

export const questionOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const questionSchema = z.object({
  id: z.string().uuid(),
  module: z.enum(MODULES),
  questionType: z.enum(QUESTION_TYPES),
  subject: z.string().optional(),
  topic: z.string().min(1),
  subtopic: z.string().optional(),
  difficulty: z.enum(DIFFICULTIES),
  questionText: z.string().min(1),
  passage: z.string().optional(),
  code: z.string().optional(),
  formula: z.string().optional(),
  tableData: z.unknown().optional(),
  diagramData: z.unknown().optional(),
  imageUrl: z.string().url().optional(),
  options: z.array(questionOptionSchema).length(4),
  correctOptionId: z.string().uuid(),
  explanation: z.string().min(1),
  estimatedTimeSeconds: z.number().int().positive(),
  sourceType: z.enum(SOURCE_TYPES),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  publicationStatus: z.enum(PUBLICATION_STATUSES),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FigureObject = z.infer<typeof figureObjectSchema>;
export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type Question = z.infer<typeof questionSchema>;
