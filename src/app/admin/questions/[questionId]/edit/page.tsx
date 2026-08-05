import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/admin/question-form";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { getEditableQuestion } from "@/lib/admin/data";
import { questionEditIdSchema } from "@/lib/admin/schemas";
import { requireRole } from "@/lib/auth/guards";

export default async function QuestionEditPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { roles } = await requireRole(["admin"]);
  const parsed = questionEditIdSchema.safeParse((await params).questionId);
  if (!parsed.success) notFound();

  let question = null;
  let loadError: string | null = null;
  try {
    question = await getEditableQuestion(parsed.data);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load this question.";
  }
  if (!loadError && !question) notFound();

  return (
    <PageShell
      eyebrow="Question editor"
      title="Revise and resubmit the question"
      description="Update the content after review feedback, preserve a version snapshot, and save it as a draft or send it back for review."
      admin
      roles={roles}
    >
      {loadError || !question ? (
        <ErrorState
          title="Question cannot be edited"
          description={loadError ?? "Unable to load this question."}
        />
      ) : (
        <QuestionForm initialQuestion={question} />
      )}
    </PageShell>
  );
}
