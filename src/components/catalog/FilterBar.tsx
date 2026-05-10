"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Label } from "@/components/ui/typography";
import { Select } from "@/components/ui/field";

const STATUS_OPTIONS = [
  { value: "stocked", label: "Stocked" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
] as const;

/**
 * Catalog filter bar. URL-search-param-driven so the Server Component
 * page re-fetches on the next render — no client state, no client
 * fetch. `useTransition` keeps the controls responsive during the
 * navigation roundtrip.
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
      className={`flex flex-wrap items-end gap-4 rounded-lg border border-hairline bg-paper px-3 py-3 transition-opacity ${pending ? "opacity-70" : ""}`}
    >
      <div className="grid gap-1">
        <Label as="label" htmlFor="filter-status">
          Status
        </Label>
        <Select
          id="filter-status"
          value={currentStatus}
          onChange={(e) => set("status", e.target.value)}
          className="min-w-[160px]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-1">
        <Label as="label" htmlFor="filter-category">
          Category
        </Label>
        <Select
          id="filter-category"
          value={currentCategoryId ?? ""}
          onChange={(e) => set("category", e.target.value || null)}
          className="min-w-[200px]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
