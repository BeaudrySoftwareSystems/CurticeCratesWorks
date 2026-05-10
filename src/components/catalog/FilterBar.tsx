"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const STATUS_OPTIONS = [
  { value: "stocked", label: "Stocked" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
] as const;

/**
 * Catalog filter bar. Mutates URL search params so the Server Component
 * page re-fetches with the new filter on the next render — no client
 * state, no client fetch. `useTransition` lets the inputs feel
 * responsive while the navigation+RSC roundtrip resolves.
 */
export interface FilterBarProps {
  categories: ReadonlyArray<{ id: string; name: string }>;
  currentStatus: string;
  currentCategoryId?: string | undefined;
}

export function FilterBar({
  categories,
  currentStatus,
  currentCategoryId,
}: FilterBarProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = (key: string, value: string | null): void => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    startTransition(() => {
      const qs = next.toString();
      router.push(qs === "" ? "/" : (`/?${qs}` as never));
    });
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${pending ? "opacity-70" : ""}`}
    >
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          Status
        </span>
        <select
          value={currentStatus}
          onChange={(e) => set("status", e.target.value)}
          className="min-h-10 rounded-md border border-slate-300 px-3 text-base shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          Category
        </span>
        <select
          value={currentCategoryId ?? ""}
          onChange={(e) => set("category", e.target.value || null)}
          className="min-h-10 rounded-md border border-slate-300 px-3 text-base shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
