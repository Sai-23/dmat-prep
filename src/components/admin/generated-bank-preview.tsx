import { ComputerScienceSubjectRenderer } from "@/components/questions/computer-science-renderer";
import { EquationRenderer } from "@/components/questions/equation-renderer";
import { FigureSequenceRenderer } from "@/components/questions/figure-sequence-renderer";
import { LatinSquareRenderer } from "@/components/questions/latin-square-renderer";
import type {
  BooleanLogicGeneratedUnit,
  FigureSequencePresentation,
  LatinSquareStructuredData,
  MathematicalEquationStructuredData,
} from "@/lib/generation";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function GeneratedBankPreview({ questionType, structuredData }: { questionType: string; structuredData: unknown }) {
  const stored = record(structuredData);
  if (!stored) return null;
  if (questionType === "mathematical_equation" && stored.task) {
    return <EquationRenderer data={stored.task as MathematicalEquationStructuredData} />;
  }
  if (questionType === "latin_square" && stored.task) {
    return <LatinSquareRenderer data={stored.task as LatinSquareStructuredData} />;
  }
  if (questionType === "figure_sequence" && stored.sequence) {
    return <FigureSequenceRenderer sequence={stored.sequence as FigureSequencePresentation} />;
  }
  if (questionType === "computer_science" && stored.stimulus && stored.questions) {
    return <ComputerScienceSubjectRenderer unit={{ schemaVersion: 1, module: "computer_science", subject: "computer_science", topic: "Computer Science", stimulus: stored.stimulus, questions: stored.questions } as BooleanLogicGeneratedUnit} />;
  }
  return null;
}
