import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    title: "Core Module",
    description:
      "Figure sequences, mathematical equations, and 5×5 Latin Squares with structured generation and validation pipelines.",
    tags: ["SVG figures", "Deterministic logic", "Timed drills"],
  },
  {
    title: "Computer Science Module",
    description:
      "Application-focused questions across algorithms, systems, databases, networks, software engineering, and discrete mathematics.",
    tags: ["Scenario-based", "Reasoning-first", "Subject-focused"],
  },
];

export function ExamOverview() {
  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="Exam structure"
        title="A foundation aligned with both the Core Module and Computer Science"
        description="Phase 1 establishes the shared architecture needed for SVG-based figures, structured data payloads, review workflows, and realistic test delivery."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <CardTitle>{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {module.tags.map((tag) => (
                <Badge key={tag} variant="subtle">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
