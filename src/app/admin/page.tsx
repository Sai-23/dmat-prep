import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  FlaskConical,
  Send,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminMetrics } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminDashboardPage() {
  const { roles } = await requireRole(["reviewer", "admin"]);
  const isAdmin = roles.includes("admin");
  let metrics = null;
  let loadError: string | null = null;

  try {
    metrics = await getAdminMetrics();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load administrative metrics.";
  }

  const cards = metrics
    ? [
        {
          label: "Total questions",
          value: metrics.totalQuestions,
          icon: FileQuestion,
        },
        {
          label: "Awaiting review",
          value: metrics.underReview,
          icon: ClipboardCheck,
        },
        {
          label: "Approved drafts",
          value: metrics.approvedDrafts,
          icon: Send,
        },
        {
          label: "Published questions",
          value: metrics.publishedQuestions,
          icon: CheckCircle2,
        },
        {
          label: "Open reports",
          value: metrics.openReports,
          icon: AlertTriangle,
        },
        {
          label: "Published tests",
          value: metrics.publishedTests,
          icon: FlaskConical,
        },
      ]
    : [];

  return (
    <PageShell
      eyebrow={isAdmin ? "Admin dashboard" : "Reviewer dashboard"}
      title={isAdmin ? "Operate the content lifecycle" : "Review content quality"}
      description={
        isAdmin
          ? "Monitor question quality, review work, publication readiness, reports, and available assessments."
          : "Monitor the review queue, validate submitted questions, and track content quality."
      }
      admin
      roles={roles}
    >
      {loadError || !metrics ? (
        <ErrorState
          title="Admin metrics unavailable"
          description={loadError ?? "Unable to load administrative metrics."}
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardContent className="flex items-start justify-between gap-4 p-6">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                    </div>
                    <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Review questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  Validate submitted questions and record an approval, rejection, or
                  change request.
                </p>
                <Button asChild>
                  <Link href="/admin/review">Open review queue</Link>
                </Button>
              </CardContent>
            </Card>
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Generate questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Create deterministic equation systems or Latin squares and inspect
                    solver, difficulty, duplicate, and validation diagnostics before saving.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href={"/admin/generate" as Route}>
                      Open validated generator
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {isAdmin ? (
              <Card>
                <CardHeader><CardTitle>Difficulty calibration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">Compare generator difficulty with observed accuracy, response time, skips, reports, and sample-gated review flags.</p>
                  <Button asChild variant="secondary"><Link href={"/admin/analytics" as Route}>Open calibration analytics</Link></Button>
                </CardContent>
              </Card>
            ) : null}
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Author a supported question type and submit it into the controlled
                    review workflow.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href="/admin/questions/new">Open question creator</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Manage tests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Assemble approved questions into timed sections and control
                    publication in the student test catalog.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href={"/admin/tests" as Route}>
                      Open test management
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      )}
    </PageShell>
  );
}
