import Link from "next/link";
import { ArrowRight, BookCheck, ChartColumn, MonitorPlay, Network } from "lucide-react";

import { ExamOverview } from "@/components/marketing/exam-overview";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { HeroSection } from "@/components/marketing/hero-section";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const previews = [
  {
    title: "Sample question preview",
    description: "Structured question payloads for figures, equations, and Latin Squares.",
    icon: BookCheck,
  },
  {
    title: "Mock-test preview",
    description: "Timed top bar, focused question area, review states, and realistic exam pacing.",
    icon: MonitorPlay,
  },
  {
    title: "Analytics preview",
    description: "Score trends, timing signals, weak topics, and recommendation-ready aggregates.",
    icon: ChartColumn,
  },
  {
    title: "Scalable architecture",
    description: "Supabase-backed schema with review workflow, versioning, reports, and auditability.",
    icon: Network,
  },
];

const faqs = [
  {
    question: "Is dMAT Prep officially affiliated with the exam?",
    answer:
      "No. The platform is independent and explicitly states that it is not affiliated with or endorsed by the official dMAT examination authorities.",
  },
  {
    question: "What is included in the MVP foundation?",
    answer:
      "The first phase sets up the Next.js app shell, Supabase integration points, route structure, domain types, and secure SQL migrations for the full platform.",
  },
  {
    question: "Which question types are supported?",
    answer:
      "The current release focuses on the Core Module: Figure Sequences, Mathematical Equations, and Latin Squares.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 py-10 lg:px-8 lg:py-14">
      <HeroSection />
      <FeatureGrid />
      <ExamOverview />

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Platform previews"
          title="A serious prep workflow from first diagnostic to targeted revision"
          description="The product surface combines practice, testing, analytics, and review loops so students can move from weak-topic detection to focused reattempts."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {previews.map(({ title, description, icon: Icon }) => (
            <Card key={title}>
              <CardHeader>
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  Phase 1 provides the shared shell, schema, and route structure needed to
                  build this module in later phases without reworking the foundation.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <Badge variant="subtle">Pricing preview</Badge>
            <CardTitle>Start with a free diagnostic, then unlock deeper preparation</CardTitle>
            <CardDescription>
              The platform foundation supports clear free-versus-premium boundaries,
              while keeping the initial user journey focused on trust and usefulness.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">Free</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Diagnostic test, selected practice sessions, and entry-level analytics.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-slate-950">Premium</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Full mocks, extended review tools, deeper performance insights, and
                structured study recommendations.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="subtle">FAQ</Badge>
            <CardTitle>Frequently asked questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{faq.question}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="bg-surface-highest text-on-surface">
        <CardContent className="flex flex-col gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              Free diagnostic test
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Establish your baseline before committing to full preparation.
            </h2>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/tests">
              Begin the diagnostic
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
