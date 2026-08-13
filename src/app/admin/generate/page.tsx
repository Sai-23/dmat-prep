import { UnifiedQuestionGenerator } from "@/components/admin/equation-generator";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function GenerateQuestionsPage() {
  const { roles } = await requireRole(["admin"]);

  return (
    <PageShell
      eyebrow="Validated generation"
      title="Generate and publish questions"
      description="Generate deterministic Core questions. Every question is published automatically only after all solver, schema, uniqueness, and difficulty checks pass."
      admin
      roles={roles}
    >
      <UnifiedQuestionGenerator />
    </PageShell>
  );
}
