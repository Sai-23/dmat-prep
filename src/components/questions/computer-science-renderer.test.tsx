import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ComputerScienceSubjectUnit, PresentationBlock } from "@/lib/generation";
import { generateCombinationalCircuitCandidate } from "@/lib/generation/computer-science";
import { generateValidatedProgrammingSubjectTestlet } from "@/lib/generation/computer-science/testlets";
import { generateValidatedOopSubjectTestlet } from "@/lib/generation/computer-science/testlets/programming-specialized";
import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import type { PracticeQuestion } from "@/lib/practice/schemas";
import { ComputerScienceSubjectRenderer, SubjectContentBlocks } from "./computer-science-renderer";

const circuitUnit: ComputerScienceSubjectUnit = {
  schemaVersion: 1,
  module: "computer_science",
  subject: "computer_science",
  topic: "Combinational Circuits",
  stimulus: {
    id: "stimulus",
    title: "Trace the combinational circuit",
    blocks: [
      { kind: "text", text: "Gate outputs are evaluated from G1 downward. Y1 and Y2 are the listed output signals." },
      { kind: "diagram", data: { inputs: ["A", "B"], gates: [{ id: "G1", operator: "or", inputs: ["A", "B"] }, { id: "G2", operator: "not", inputs: ["G1"] }], outputs: { Y1: "G1", Y2: "G2" } } },
    ],
  },
  questions: [
    {
      id: "question-1", topic: "Combinational Circuits", difficulty: "easy", prompt: "For input scenario S1, what are outputs Y1Y2?",
      blocks: [{ kind: "table", data: { headers: ["A", "B"], rows: [["T", "T"]] } }],
      options: ["FT", "TT", "FF", "TF"].map((content, index) => ({ id: `q1-${index}`, label: String.fromCharCode(65 + index), content })) as never,
      correctOptionId: "q1-3", explanation: "Y1Y2 = TF.", estimatedSolveTimeSeconds: 55,
    },
    {
      id: "question-2", topic: "Combinational Circuits", difficulty: "easy", prompt: "For input scenario S2, what are outputs Y1Y2?",
      blocks: [{ kind: "table", data: { headers: ["A", "B"], rows: [["F", "T"]] } }],
      options: ["FT", "TT", "FF", "TF"].map((content, index) => ({ id: `q2-${index}`, label: String.fromCharCode(65 + index), content })) as never,
      correctOptionId: "q2-3", explanation: "Y1Y2 = TF.", estimatedSolveTimeSeconds: 55,
    },
  ],
};

function practiceQuestion(): PracticeQuestion {
  return {
    id: "cs", module: "computer_science", questionType: "computer_science", topic: "Combinational Circuits", subtopic: "combinational_circuits",
    difficulty: "easy", questionText: "Trace the circuit", passage: null, code: null, formula: null, tableData: null, imageUrl: null,
    estimatedTimeSeconds: 110, structuredData: { stimulus: circuitUnit.stimulus, questions: circuitUnit.questions }, options: [], response: { kind: "subject_answers" },
  };
}

describe("Computer Science structured-data rendering", () => {
  it("renders the circuit as SVG without raw circuit JSON", () => {
    const html = renderToStaticMarkup(<ComputerScienceSubjectRenderer unit={circuitUnit} />);
    expect(html).toContain("Combinational circuit diagram");
    expect(html).toContain("A</text>");
    expect(html).toContain("B</text>");
    expect(html).toContain("OR</text>");
    expect(html).toContain("NOT</text>");
    expect(html).toContain("Y1 output");
    expect(html).toContain("Y2 output");
    expect(html).not.toContain('&quot;operator&quot;');
    expect(html).not.toContain('&quot;gates&quot;');
  });

  it("renders scenario tables as compact Boolean states without JSON", () => {
    const blocks = [...circuitUnit.questions[0].blocks, ...circuitUnit.questions[1].blocks] as PresentationBlock[];
    const html = renderToStaticMarkup(<SubjectContentBlocks blocks={blocks} />);
    expect(html).toContain("<b>A</b> = T");
    expect(html).toContain("<b>B</b> = T");
    expect(html).toContain("<b>A</b> = F");
    expect(html).not.toContain('&quot;headers&quot;');
    expect(html).not.toContain('&quot;rows&quot;');
  });

  it("uses four selectable controls, keeps one shared stimulus, and hides mock answers", () => {
    const html = renderToStaticMarkup(<NativePracticeResponse answer={null} disabled={false} onChange={() => undefined} question={practiceQuestion()} />);
    expect(html.match(/role="radio"/g)).toHaveLength(4);
    expect(html.match(/data-shared-stimulus/g)).toHaveLength(1);
    expect(html).toContain("Question 1 of 2");
    expect(html).toContain("Go to question 2");
    expect(html).not.toContain("Correct answer:");
    expect(html).not.toContain("Not quite");
  });

  it("shows readable practice feedback without response objects or IDs", () => {
    const html = renderToStaticMarkup(<NativePracticeResponse answer={{ kind: "subject_answers", answers: { "question-1": "q1-0" } }} correctAnswer={{ "question-1": "q1-3", "question-2": "q2-3" }} disabled onChange={() => undefined} question={practiceQuestion()} />);
    expect(html).toContain("Not quite");
    expect(html).toContain("trace the gates from G1 downward");
    expect(html).toContain("Your answer: <b>FT</b>");
    expect(html).toContain("Correct answer: <b>TF</b>");
    expect(html).not.toContain("q1-0");
    expect(html).not.toContain("question-1");
  });

  it("leaves deterministic generator and solver output unchanged", () => {
    const candidate = generateCombinationalCircuitCandidate({ seed: "rendering-only", difficulty: "medium" }, 1);
    expect(candidate.family).toBe("combinational_circuits");
    expect(candidate.questions).toHaveLength(2);
    expect(candidate.questions.every((question) => question.options.length === 4)).toBe(true);
  });

  it("renders Programming pseudocode and numeric array state without raw JSON", () => {
    const unit = generateValidatedProgrammingSubjectTestlet({ seed: "programming-render", difficulty: "easy" });
    const html = renderToStaticMarkup(<ComputerScienceSubjectRenderer unit={unit} />);
    expect(html).toContain("function transform(values)");
    expect(html).toContain("index 0");
    expect(html).toContain("data-language");
    expect(html).not.toContain('&quot;headers&quot;');
    expect(html).not.toContain('&quot;rows&quot;');
  });

  it("renders matrices and OOP relationship diagrams without raw JSON", () => {
    const matrix = renderToStaticMarkup(<SubjectContentBlocks blocks={[{ kind: "table", data: [[1, 2], [3, 4]] }]} />);
    const oop = renderToStaticMarkup(<ComputerScienceSubjectRenderer unit={generateValidatedOopSubjectTestlet({ seed: "oop-diagram", difficulty: "medium" })} />);
    expect(matrix).toContain("Column 1");
    expect(matrix).toContain(">4</td>");
    expect(oop).toContain("data-structured-diagram");
    expect(oop).toContain("Structured relationship diagram");
    expect(oop).not.toContain('&quot;nodes&quot;');
    expect(oop).not.toContain('&quot;edges&quot;');
  });
});
