import { PageShell } from "@/components/layout/page-shell";

const metricSkeletons = ["attempts", "accuracy", "time", "bookmarks"];

export default function DashboardLoading() {
  return (
    <PageShell
      eyebrow="Student dashboard"
      title="Loading your preparation workspace"
      description="Gathering your latest attempts, recommendations, and topic insights."
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metricSkeletons.map((metric) => (
          <div
            className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white"
            key={metric}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
    </PageShell>
  );
}
