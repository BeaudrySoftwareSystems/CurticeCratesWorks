"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  archiveItemAction,
  type ArchiveFormState,
} from "@/app/actions/archive";
import { Button } from "@/components/ui/button";
import { Title } from "@/components/ui/typography";

const INITIAL: ArchiveFormState = { status: "idle" };

/**
 * Confirm-and-archive dialog. v1 has no archive-reason column on items
 * so the dialog is a single confirm — anything fancier would be UI noise
 * without persisted backing.
 */
export function ArchiveDialog({
  itemId,
}: {
  itemId: string;
}): React.ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(archiveItemAction, INITIAL);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (d === null) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="flex-1"
      >
        Archive
      </Button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl border border-hairline bg-kraft p-0 text-soot shadow-[0_4px_16px_oklch(22%_0.008_60_/_0.10),0_12px_32px_oklch(22%_0.008_60_/_0.08)] backdrop:bg-soot/40"
        onClose={() => setOpen(false)}
      >
        <form action={formAction} className="grid gap-4 p-5">
          <input type="hidden" name="itemId" value={itemId} />
          <header className="grid gap-1">
            <Title>Archive item</Title>
            <p className="font-sans text-[13px] text-driftwood">
              Removes this item from the active catalog. Past sales records
              are preserved.
            </p>
          </header>
          {state.status === "error" && state.message !== undefined ? (
            <p
              role="alert"
              className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[13px] text-signal"
            >
              {state.message}
            </p>
          ) : null}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </dialog>
    </>
  );
}

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="flex-1"
    >
      {pending ? "Archiving…" : "Archive"}
    </Button>
  );
}
