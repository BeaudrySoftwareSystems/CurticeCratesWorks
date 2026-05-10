"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Popover } from "@/components/ui/popover";

const STATUS_OPTIONS = [
  { value: "stocked", label: "Stocked" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
] as const;

/**
 * Catalog filter bar in the Linear-style chip pattern: each filter is
 * a small button-shaped chip that shows `Label · Value ⌄`, taps open
 * a popover with options. Selected option is checked; selecting any
 * option closes the popover and updates the URL search params, which
 * the Server Component picks up on the next render.
 *
 * Two filters today (status + category) so we render them side-by-side
 * without an "Add filter" composer. Mobile uses the same pattern —
 * the popover content is just a vertical list with 48px tap targets,
 * which is fine without a separate native-select fallback.
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

  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === currentStatus)?.label ?? "Stocked";
  const categoryLabel =
    currentCategoryId === undefined || currentCategoryId === ""
      ? "All"
      : (categories.find((c) => c.id === currentCategoryId)?.name ?? "Unknown");

  return (
    <div
      className={`flex flex-wrap items-center gap-2 transition-opacity ${pending ? "opacity-70" : ""}`}
    >
      <FilterChip
        label="Status"
        value={statusLabel}
        options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        currentValue={currentStatus}
        onPick={(v) => set("status", v)}
      />
      <FilterChip
        label="Category"
        value={categoryLabel}
        options={[
          { value: "", label: "All categories" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
        currentValue={currentCategoryId ?? ""}
        onPick={(v) => set("category", v === "" ? null : v)}
      />
    </div>
  );
}

interface ChipOption {
  value: string;
  label: string;
}

function FilterChip({
  label,
  value,
  options,
  currentValue,
  onPick,
}: {
  label: string;
  value: string;
  options: readonly ChipOption[];
  currentValue: string;
  onPick: (next: string) => void;
}): React.ReactElement {
  return (
    <Popover
      role="listbox"
      align="start"
      panelClassName="min-w-[200px] py-1"
      closeOnSelect
      trigger={({ open, triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 font-sans text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 ${
            open
              ? "border-edge bg-kraft text-soot"
              : "border-hairline bg-paper text-soot hover:border-edge hover:bg-kraft"
          }`}
        >
          <span className="text-driftwood">{label}</span>
          <span aria-hidden className="text-smoke">
            ·
          </span>
          <span className="font-medium">{value}</span>
          <Chevron open={open} />
        </button>
      )}
    >
      <ul className="grid">
        {options.map((opt) => {
          const selected = opt.value === currentValue;
          return (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onPick(opt.value)}
                className={`flex h-10 w-full items-center justify-between gap-3 px-3 font-sans text-[14px] text-soot transition-colors hover:bg-paper focus:outline-none focus-visible:bg-paper ${
                  selected ? "bg-paper" : ""
                }`}
              >
                <span>{opt.label}</span>
                {selected ? (
                  <CheckGlyph />
                ) : (
                  <span aria-hidden className="h-3 w-3" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}

function Chevron({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      aria-hidden
      className={`text-driftwood transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2.5 4.5 L 6 8 L 9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function CheckGlyph(): React.ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden
      className="text-ember"
    >
      <path
        d="M2.5 6.5 L 5 9 L 9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
