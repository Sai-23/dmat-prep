import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Figure Sequences",
    description:
      "SVG-driven visual transformations with structured figure objects, rule tracking, and deterministic answer validation.",
    badges: ["Core Module", "SVG", "Rule-based"],
  },
  {
    title: "Mathematical Equations",
    description:
      "Programmatically generated systems and substitutions with unique-solution checks and distractor validation.",
    badges: ["Core Module", "Deterministic", "Validated"],
  },
  {
    title: "Latin Squares",
    description:
      "5×5 grid reasoning with controlled cell removal, permutation logic, and single-answer guarantees.",
    badges: ["Core Module", "Constraint logic", "Uniqueness"],
  },
];

export default function ExamFormatPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 lg:px-8">
      <SectionHeading
        eyebrow="Exam format"
        title="Understand the structure before you start preparing"
        description="dMAT Prep supports the Core Module with dedicated question and test architecture for its three question types."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {section.badges.map((badge) => (
                <Badge key={badge} variant="subtle">
                  {badge}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
