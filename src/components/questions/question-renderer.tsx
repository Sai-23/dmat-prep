import { EquationRenderer } from "./equation-renderer";
import { LatinSquareRenderer } from "./latin-square-renderer";
import { FigureSequenceRenderer } from "./figure-sequence-renderer";
import type {
  FigureSequenceQuestion,
  LatinSquareQuestion,
  MathematicalEquationQuestion,
} from "@/lib/generation";

type RenderableQuestion = MathematicalEquationQuestion | LatinSquareQuestion | FigureSequenceQuestion;

export function QuestionRenderer({
  question,
}: {
  question: RenderableQuestion;
}) {
  if (question.questionType === "mathematical_equation") {
    return <EquationRenderer data={question.structuredData} />;
  }
  if (question.questionType === "latin_square") {
    return <LatinSquareRenderer data={question.structuredData} />;
  }
  if (question.questionType === "figure_sequence") {
    return <FigureSequenceRenderer sequence={question.sequence} />;
  }
  return null;
}
