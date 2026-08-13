export const DMAT_EXAM_SPEC = {
  version: "dmat-core-2026-08-09",
  core: [
    { sectionType: "figure_sequence", title: "Figure Sequences", questionCount: 20, durationSeconds: 25 * 60 },
    { sectionType: "mathematical_equation", title: "Mathematical Equations", questionCount: 20, durationSeconds: 25 * 60 },
    { sectionType: "latin_square", title: "Latin Squares", questionCount: 20, durationSeconds: 25 * 60 },
  ],
} as const;

export type ExamSectionSnapshot = {
  id: string;
  title: string;
  sectionType: string;
  durationSeconds: number;
  sortOrder: number;
};

export function validateOfficialFullMockSections(
  sections: Array<ExamSectionSnapshot & { questionCount: number }>,
) {
  const expected = [...DMAT_EXAM_SPEC.core];
  if (sections.length !== expected.length) return "A full mock must contain the three Core subtests.";
  for (let index = 0; index < expected.length; index += 1) {
    const actual = sections[index];
    const specification = expected[index];
    if (actual.sectionType !== specification.sectionType || actual.durationSeconds !== specification.durationSeconds) {
      return `${specification.title} must use the official section type and duration.`;
    }
    if (actual.questionCount !== specification.questionCount) {
      return `${specification.title} must contain ${specification.questionCount} questions.`;
    }
  }
  return null;
}

export function activeSectionAt(
  sections: ExamSectionSnapshot[],
  startedAtMs: number,
  nowMs: number,
) {
  let boundary = startedAtMs;
  for (const section of sections) {
    const expiresAt = boundary + section.durationSeconds * 1000;
    if (nowMs < expiresAt) return { section, startedAt: boundary, expiresAt };
    boundary = expiresAt;
  }
  return null;
}
