import { describe, expect, it } from "vitest";
import { activeSectionAt, DMAT_EXAM_SPEC, validateOfficialFullMockSections } from "./exam-spec";

describe("official dMAT mock specification", () => {
  const sections = [...DMAT_EXAM_SPEC.core, DMAT_EXAM_SPEC.subject].map((section, index) => ({
    id: String(index), title: section.title, sectionType: section.sectionType,
    durationSeconds: section.durationSeconds, sortOrder: index + 1,
    questionCount: section.questionCount ?? 12,
  }));

  it("accepts the official Computer Science full-mock section structure", () => {
    expect(validateOfficialFullMockSections(sections)).toBeNull();
  });

  it("rejects wrong Core counts or duplicated generic timing", () => {
    expect(validateOfficialFullMockSections(sections.map((section, index) => index === 0 ? { ...section, questionCount: 19 } : section))).toMatch(/20/);
    expect(validateOfficialFullMockSections(sections.map((section, index) => index === 3 ? { ...section, durationSeconds: 1500 } : section))).not.toBeNull();
  });

  it("enforces independent, contiguous server-authoritative section boundaries", () => {
    expect(activeSectionAt(sections, 0, 1499_999)?.section.sectionType).toBe("figure_sequence");
    expect(activeSectionAt(sections, 0, 1500_000)?.section.sectionType).toBe("mathematical_equation");
    expect(activeSectionAt(sections, 0, 4500_000)?.section.sectionType).toBe("computer_science");
    expect(activeSectionAt(sections, 0, 9_900_000)).toBeNull();
  });
});
