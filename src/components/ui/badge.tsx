import type { ReactNode } from "react";

/**
 * Status pills carrying the spec's hue-distance rule: stocked / sold /
 * archived / intake-skipped each get a distinct treatment that combines
 * tone + label so a glance distinguishes them without relying on color
 * alone (a11y rule from PRODUCT.md).
 *
 * Stocked is the default state — lowest visual weight (outlined). Sold
 * is filled neutral so it reads as a settled end state. Archived washes
 * out. Intake-skipped lights up Lantern Amber, the only warning hue in
 * the system, to flag a stub record.
 */

type Tone = "stocked" | "sold" | "archived" | "intake-skipped";

const TONES: Record<Tone, string> = {
  stocked:
    "border border-edge bg-bone text-soot",
  sold: "border border-transparent bg-kraft text-driftwood",
  archived:
    "border border-transparent bg-hairline text-smoke",
  "intake-skipped":
    "border border-transparent bg-lantern/20 text-[oklch(40%_0.10_75)]",
};

export interface BadgeProps {
  tone: Tone;
  children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-[3px] font-sans text-[10px] font-medium uppercase tracking-[0.08em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}): React.ReactElement {
  const tone: Tone =
    status === "stocked"
      ? "stocked"
      : status === "sold"
        ? "sold"
        : "archived";
  return <Badge tone={tone}>{status}</Badge>;
}
