"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { soldPlatformEnum } from "@/db/schema";
import {
  quickRecordSaleAction,
  type QuickRecordSaleFormState,
} from "@/app/actions/sale";
import { TEXT_MAX_LENGTH } from "@/domain/category";

const PLATFORMS = soldPlatformEnum.enumValues;
const INITIAL: QuickRecordSaleFormState = { status: "idle" };

/**
 * Quick-record-sale form (R11). Bypasses category-attribute validation
 * — `intake_skipped = true` on the items row is the data-level guard
 * that distinguishes these stub records from full-lifecycle items
 * (rendered as a badge in CatalogList).
 *
 * Title is optional but recommended — without it the catalog card
 * shows only the display id.
 */
export interface QuickSaleFormProps {
  categories: ReadonlyArray<{ id: string; name: string }>;
}

export function QuickSaleForm({
  categories,
}: QuickSaleFormProps): React.ReactElement {
  const [state, formAction] = useActionState(quickRecordSaleAction, INITIAL);

  return (
    <form action={formAction} className="grid gap-6 pb-24">
      {state.status === "error" && state.message !== undefined ? (
        <p
          role="alert"
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
        >
          {state.message}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
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
            placeholder="0.00"
            className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
          />
          {state.fieldErrors?.["soldPrice"] !== undefined ? (
            <p role="alert" className="text-sm text-rose-600">
              {state.fieldErrors["soldPrice"]}
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
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
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
            htmlFor="categoryId"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue=""
            className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">— Uncategorized —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-2">
        <label
          htmlFor="title"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={TEXT_MAX_LENGTH}
          placeholder="Short identifier (recommended)"
          className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
        />
        {state.fieldErrors?.["title"] !== undefined ? (
          <p role="alert" className="text-sm text-rose-600">
            {state.fieldErrors["title"]}
          </p>
        ) : null}
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
          maxLength={TEXT_MAX_LENGTH}
          placeholder="e.g. depop username, IG handle"
          className="min-h-12 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
        />
        {state.fieldErrors?.["buyerReference"] !== undefined ? (
          <p role="alert" className="text-sm text-rose-600">
            {state.fieldErrors["buyerReference"]}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <SubmitButton />
        </div>
      </div>
    </form>
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
      {pending ? "Recording…" : "Record sale"}
    </button>
  );
}
