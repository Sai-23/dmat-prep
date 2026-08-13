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

export type EquationGenerationRequest = z.infer<
  typeof equationGenerationRequestSchema
>;
