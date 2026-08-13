"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteQuestionAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function removeQuestion() {
    setError(null);
    startTransition(async () => {
      const response = await deleteQuestionAction({ questionId });
      if (response.error) {
        setError(response.error);
        return;
      }
      setOpen(false);
      router.push("/admin/review");
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="destructive">
        <Trash2 className="h-4 w-4" />
        Delete question
      </Button>
      <Dialog onOpenChange={(nextOpen) => { if (!pending) setOpen(nextOpen); }} open={open} title="Delete this question?">
        <div className="space-y-5">
          <p className="text-sm leading-6 text-on-surface-variant">
            This removes it from the active question bank and from all new Practice and Mock selections. Existing attempts remain available through their immutable snapshots.
          </p>
          {error ? <p className="rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button disabled={pending} onClick={() => setOpen(false)} variant="outline">Cancel</Button>
            <Button disabled={pending} onClick={removeQuestion} variant="destructive">
              <Trash2 className="h-4 w-4" />
              {pending ? "Deleting…" : "Delete question"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
