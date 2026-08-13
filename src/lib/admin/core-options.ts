import { QUESTION_TYPES } from "@/types/questions";

type QuestionType = (typeof QUESTION_TYPES)[number];

export const ADMIN_CORE_QUESTION_TYPE_OPTIONS = [
  { value: "figure_sequence", label: "Figure sequence" },
  { value: "mathematical_equation", label: "Mathematical equation" },
  { value: "latin_square", label: "Latin square" },
] as const satisfies ReadonlyArray<{ value: QuestionType; label: string }>;

export const ADMIN_CORE_SECTION_TYPE_OPTIONS = [
  { value: "figure_sequence", label: "Figure Sequences" },
  { value: "mathematical_equation", label: "Mathematical Equations" },
  { value: "latin_square", label: "Latin Squares" },
] as const;
