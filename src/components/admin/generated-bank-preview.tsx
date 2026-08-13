import { EquationRenderer } from "@/components/questions/equation-renderer";
import { FigureSequenceRenderer } from "@/components/questions/figure-sequence-renderer";
import { LatinSquareRenderer } from "@/components/questions/latin-square-renderer";
import type {
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
  return null;
}
