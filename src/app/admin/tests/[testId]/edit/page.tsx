import { notFound } from "next/navigation";

import { TestBuilder } from "@/components/admin/test-builder";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import {
  getAdminQuestionBank,
  getEditableAdminTest,
} from "@/lib/admin/test-data";
import { adminTestIdSchema } from "@/lib/admin/test-schemas";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminTestEditPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { roles } = await requireRole(["admin"]);
  const parsed = adminTestIdSchema.safeParse((await params).testId);
  if (!parsed.success) notFound();

  let test = null;
  let questionBank = null;
  let loadError: string | null = null;
  try {
    [test, questionBank] = await Promise.all([
      getEditableAdminTest(parsed.data),
      getAdminQuestionBank(),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load this test.";
  }
  if (!loadError && !test) notFound();

  return (
    <PageShell
      eyebrow="Test editor"
      title="Revise the assessment structure"
      description="Update an unpublished test before any student attempts exist, then save it as a draft or publish it."
      admin
      roles={roles}
    >
      {loadError || !test || !questionBank ? (
        <ErrorState
          title="Test cannot be edited"
          description={loadError ?? "Unable to load this test."}
        />
      ) : (
        <TestBuilder initialTest={test} questionBank={questionBank} />
      )}
    </PageShell>
  );
}
