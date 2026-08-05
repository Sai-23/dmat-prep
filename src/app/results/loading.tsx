import { PageShell } from "@/components/layout/page-shell";

export default function ResultsLoading() {
  return (
    <PageShell
      eyebrow="Results"
      title="Loading your results"
      description="Preparing scores, performance breakdowns, and question review."
    >
      <div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
    </PageShell>
  );
}
