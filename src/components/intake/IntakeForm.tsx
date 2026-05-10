"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  finalizeIntakeAction,
  type FinalizeIntakeFormState,
} from "@/app/actions/intake";
import type { AttributeDefinition } from "@/domain/category";
import { TEXT_MAX_LENGTH } from "@/domain/category";
import { AttributeFields } from "@/components/intake/AttributeFields";
import { PhotoCapture } from "@/components/intake/PhotoCapture";

/**
 * Single-scroll mobile-first intake form (not a wizard). Sections, top to
 * bottom: photos → attributes → location → cost / list price. The primary
 * action sits sticky at the bottom of the viewport for one-handed
 * warehouse use. Disabled while any photo upload is in flight or while
 * the Server Action is pending.
 *
 * Photos are uploaded against `itemId` (a draft created server-side at
 * page mount) — by the time the action runs, photos are already linked.
 */
export interface IntakeFormProps {
  itemId: string;
  categoryId: string;
  categoryName: string;
  definitions: readonly AttributeDefinition[];
}

const INITIAL: FinalizeIntakeFormState = { status: "idle" };

export function IntakeForm({
  itemId,
  categoryId,
  categoryName,
  definitions,
}: IntakeFormProps): React.ReactElement {
  const [state, formAction] = useActionState(finalizeIntakeAction, INITIAL);
  const [uploading, setUploading] = useState(false);

  return (
    <form action={formAction} className="grid gap-6 pb-24">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="categoryId" value={categoryId} />

      <header className="grid gap-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          New {categoryName}
        </p>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Intake
        </h1>
      </header>

      {state.status === "error" && state.message !== undefined ? (
        <p
          role="alert"
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
        >
          {state.message}
        </p>
      ) : null}

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Photos
        </h2>
        <PhotoCapture itemId={itemId} onUploadingChange={setUploading} />
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Attributes
        </h2>
        <AttributeFields
          definitions={definitions}
          fieldErrors={state.fieldErrors}
        />
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Location
        </h2>
        <input
          name="location"
          type="text"
          maxLength={TEXT_MAX_LENGTH}
          placeholder="e.g. A1, top shelf"
          className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
        />
        {state.fieldErrors?.["location"] !== undefined ? (
          <p role="alert" className="text-sm text-rose-600">
            {state.fieldErrors["location"]}
          </p>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="cost"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Cost
            <span aria-hidden className="ml-1 text-rose-600">
              *
            </span>
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
          />
          {state.fieldErrors?.["cost"] !== undefined ? (
            <p role="alert" className="text-sm text-rose-600">
              {state.fieldErrors["cost"]}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="listPrice"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            List price
          </label>
          <input
            id="listPrice"
            name="listPrice"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
          />
          {state.fieldErrors?.["listPrice"] !== undefined ? (
            <p role="alert" className="text-sm text-rose-600">
              {state.fieldErrors["listPrice"]}
            </p>
          ) : null}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <SubmitButton uploading={uploading} />
          {uploading ? (
            <span className="text-sm text-slate-500">Photos uploading…</span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function SubmitButton({
  uploading,
}: {
  uploading: boolean;
}): React.ReactElement {
  const { pending } = useFormStatus();
  const disabled = pending || uploading;
  return (
    <button
      type="submit"
      disabled={disabled}
      className="min-h-12 flex-1 rounded-md bg-blue-600 px-4 text-base font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Saving…" : "Save & continue"}
    </button>
  );
}
