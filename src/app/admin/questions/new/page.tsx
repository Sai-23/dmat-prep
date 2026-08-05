import { QuestionForm } from "@/components/admin/question-form";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function QuestionCreatorPage() {
  const { roles } = await requireRole(["admin"]);

  return (
    <PageShell
      eyebrow="Question creator"
      title="Author and submit structured questions"
      description="Create one of the supported question types, define four answer options, preview the content, and save a draft or submit it for independent review."
      admin
      roles={roles}
    >
      <QuestionForm />
    </PageShell>
  );
}
