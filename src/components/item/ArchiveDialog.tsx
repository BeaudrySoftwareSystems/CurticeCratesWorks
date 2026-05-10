"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  archiveItemAction,
  type ArchiveFormState,
} from "@/app/actions/archive";

const INITIAL: ArchiveFormState = { status: "idle" };

/**
 * Confirm-and-archive dialog. v1 has no archive-reason column on items
 * so the dialog is a single confirm button — anything fancier would be
 * UI noise without persisted backing.
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-base font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        Archive
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg p-0 backdrop:bg-slate-900/60"
        onClose={() => setOpen(false)}
      >
        <form
          action={formAction}
          className="grid gap-4 bg-white p-5 dark:bg-slate-900"
        >
          <input type="hidden" name="itemId" value={itemId} />
          <header className="grid gap-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Archive item
            </h2>
            <p className="text-sm text-slate-500">
              Removes this item from the active catalog. Past sales records
              are preserved.
            </p>
          </header>
          {state.status === "error" && state.message !== undefined ? (
            <p
              role="alert"
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {state.message}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-base font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
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
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 flex-1 rounded-md bg-rose-600 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Archiving…" : "Archive"}
    </button>
  );
}
