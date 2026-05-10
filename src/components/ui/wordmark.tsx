import { Logo } from "./logo";

/**
 * Backwards-compatible re-export. The actual mark lives in <Logo /> now
 * (code-rendered serif italic + inline SVG ornament), but every page in
 * the app imports `Wordmark` so we keep the surface stable.
 *
 * Logo decides layout from `size`: sm renders inline (tight for the
 * sticky header), md/lg render stacked, lg adds the tagline.
 */
export function Wordmark({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
  /** Kept for API compatibility; Logo handles font preload via next/font. */
  priority?: boolean;
}): React.ReactElement {
  return <Logo size={size} />;
}

/**
 * The display_id treatment that becomes the system's recognizable
 * numeric. `CCI-` prefix is faint Driftwood, the digits are full Soot,
 * everything is Geist Mono so the format reads like an SKU at a glance.
 */
export function DisplayId({
  displayId,
}: {
  displayId: number;
}): React.ReactElement {
  const padded = String(displayId).padStart(6, "0");
  return (
    <span className="tabular text-[14px]">
      <span className="text-driftwood">CCI-</span>
      <span className="text-soot">{padded}</span>
    </span>
  );
}
