import { z } from "zod";

export const equationGenerationRequestSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  quantity: z.coerce.number().int().min(1).max(20),
  seed: z.string().trim().max(200).optional().transform((value) => value || null),
});

export const generatedEquationSaveSchema = z.object({
  seed: z.string().trim().min(1).max(250),
  difficulty: z.enum(["easy", "medium", "hard"]),
  attemptCount: z.number().int().min(1).max(100),
  fingerprint: z.string().regex(/^mathematical-equation:v1:[a-f0-9]{16}$/),
});

export const latinGenerationRequestSchema = equationGenerationRequestSchema;
export const figureGenerationRequestSchema = equationGenerationRequestSchema;
export const computerScienceGenerationRequestSchema = equationGenerationRequestSchema.extend({
  family: z.enum(["boolean_truth_tables", "combinational_circuits", "programming_trace", "programming_recursion", "programming_oop"]),
  targetSize: z.union([z.literal("auto"), z.coerce.number().int().min(4).max(8)]),
  generationMode: z.enum(["deterministic", "hybrid_dynamic"]).default("deterministic"),
});

export const generatedLatinSaveSchema = z.object({
  seed: z.string().trim().min(1).max(250),
  difficulty: z.enum(["easy", "medium", "hard"]),
  attemptCount: z.number().int().min(1).max(5_000),
  fingerprint: z.string().regex(/^latin-square:v1:[a-f0-9]{16}$/),
});

export const generatedFigureSaveSchema = z.object({
  seed: z.string().trim().min(1).max(250),
  difficulty: z.enum(["easy", "medium", "hard"]),
  attemptCount: z.number().int().min(1).max(5_000),
  fingerprint: z.string().regex(/^figure-sequence:v1:[a-f0-9]{16}$/),
});

export const generatedComputerScienceSaveSchema = z.object({
  family: z.enum(["boolean_truth_tables", "combinational_circuits", "programming_trace", "programming_recursion", "programming_oop"]),
  targetSize: z.union([z.literal("auto"), z.number().int().min(4).max(8)]),
  seed: z.string().trim().min(1).max(250),
  difficulty: z.enum(["easy", "medium", "hard"]),
  attemptCount: z.number().int().min(1).max(5_000),
  fingerprint: z.string().regex(/^computer-science-testlet:v1:[a-f0-9]{16}$/),
  generationMode: z.enum(["deterministic", "hybrid_dynamic"]).default("deterministic"),
  snapshot: z.unknown().optional(),
});

export type EquationGenerationRequest = z.infer<
  typeof equationGenerationRequestSchema
>;
