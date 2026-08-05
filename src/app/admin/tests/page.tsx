import { TestManager } from "@/components/admin/test-manager";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { getAdminTests } from "@/lib/admin/test-data";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminTestsPage() {
  const { roles } = await requireRole(["admin"]);
  let tests = null;
  let loadError: string | null = null;
  try {
    tests = await getAdminTests();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load test management.";
  }

  return (
    <PageShell
      eyebrow="Test management"
      title="Build and publish student assessments"
      description="Manage draft and published diagnostics, sectional tests, mini mocks, and full mock examinations."
      admin
      roles={roles}
    >
      {loadError || !tests ? (
        <ErrorState
          title="Test management unavailable"
          description={loadError ?? "Unable to load test management."}
        />
      ) : (
        <TestManager initialTests={tests} />
      )}
    </PageShell>
  );
}
