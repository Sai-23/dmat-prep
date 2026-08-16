import type { AdminQuestionBankItem } from "./test-schemas";

export type MockQuestionFilters = {
  module: "core" | null;
  sectionType: AdminQuestionBankItem["questionType"] | "mixed";
  questionType: AdminQuestionBankItem["questionType"] | "all";
  difficulty: AdminQuestionBankItem["difficulty"] | "all";
  search: string;
};

export function filterMockQuestions(
  questions: readonly AdminQuestionBankItem[],
  filters: MockQuestionFilters,
) {
  const search = filters.search.trim().toLowerCase();
  return questions.filter((question) =>
    (!filters.module || question.module === filters.module) &&
    (filters.sectionType === "mixed" || question.questionType === filters.sectionType) &&
    (filters.questionType === "all" || question.questionType === filters.questionType) &&
    (filters.difficulty === "all" || question.difficulty === filters.difficulty) &&
    (!search || `${question.id} ${question.questionText} ${question.topic} ${question.subtopic ?? ""}`.toLowerCase().includes(search)),
  );
}

export function summarizeMockComposition(questions: readonly AdminQuestionBankItem[]) {
  return {
    difficulty: {
      easy: questions.filter((question) => question.difficulty === "easy").length,
      medium: questions.filter((question) => question.difficulty === "medium").length,
      hard: questions.filter((question) => question.difficulty === "hard").length,
    },
    questionType: {
      figure_sequence: questions.filter((question) => question.questionType === "figure_sequence").length,
      mathematical_equation: questions.filter((question) => question.questionType === "mathematical_equation").length,
      latin_square: questions.filter((question) => question.questionType === "latin_square").length,
    },
  };
}
