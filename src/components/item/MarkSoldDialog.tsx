"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { soldPlatformEnum } from "@/db/schema";
import {
  markSoldAction,
  type MarkSoldFormState,
} from "@/app/actions/sale";

const PLATFORMS = soldPlatformEnum.enumValues;
const INITIAL: MarkSoldFormState = { status: "idle" };

/**
 * Native <dialog>-backed Mark Sold modal. Renders the form with
 * sold price (required), sold date (default today), platform
 * (defaults to nothing — null means "don't know yet"), and an
 * optional buyer reference. Submits to `markSoldAction`, which
 * redirects to the same item detail on success.
 */
export interface MarkSoldDialogProps {
  itemId: string;
  defaultListPrice?: string | null;
}

export function MarkSoldDialog({
  itemId,
  defaultListPrice,
}: MarkSoldDialogProps): React.ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(markSoldAction, INITIAL);
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
        className="min-h-12 flex-1 rounded-md bg-blue-600 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Mark sold
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-lg p-0 backdrop:bg-slate-900/60"
        onClose={() => setOpen(false)}
      >
        <form
          action={formAction}
          className="grid gap-4 bg-white p-5 dark:bg-slate-900"
        >
          <input type="hidden" name="itemId" value={itemId} />
          <header className="grid gap-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Mark sold
            </h2>
            <p className="text-sm text-slate-500">
              Capture the sale details. Platform is optional —
              leave blank if you don&apos;t know yet.
            </p>
          </header>

          {state.status === "error" && state.message !== undefined ? (
            <p
              role="alert"
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
            >
              {state.message}
            </p>
          ) : null}

          <div className="grid gap-2">
            <label
              htmlFor="soldPrice"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Sold price
              <span aria-hidden className="ml-1 text-rose-600">
                *
              </span>
            </label>
            <input
              id="soldPrice"
              name="soldPrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              defaultValue={defaultListPrice ?? ""}
              className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
            />
            {state.fieldErrors?.["soldPrice"] !== undefined ? (
              <p role="alert" className="text-sm text-rose-600">
                {state.fieldErrors["soldPrice"]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label
                htmlFor="platform"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Platform
              </label>
              <select
                id="platform"
                name="platform"
                defaultValue=""
                className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">— Not yet known —</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.["platform"] !== undefined ? (
                <p role="alert" className="text-sm text-rose-600">
                  {state.fieldErrors["platform"]}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="soldAt"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Sold date
              </label>
              <input
                id="soldAt"
                name="soldAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
              />
              {state.fieldErrors?.["soldAt"] !== undefined ? (
                <p role="alert" className="text-sm text-rose-600">
                  {state.fieldErrors["soldAt"]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="buyerReference"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Buyer reference
            </label>
            <input
              id="buyerReference"
              name="buyerReference"
              type="text"
              maxLength={200}
              placeholder="e.g. depop username, IG handle"
              className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
            />
            {state.fieldErrors?.["buyerReference"] !== undefined ? (
              <p role="alert" className="text-sm text-rose-600">
                {state.fieldErrors["buyerReference"]}
              </p>
            ) : null}
          </div>

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
      className="min-h-12 flex-1 rounded-md bg-blue-600 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Saving…" : "Confirm"}
    </button>
  );
}
