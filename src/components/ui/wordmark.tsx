/**
 * The Curtis Crates wordmark — the system's only identity signal.
 *
 * Geist Sans 600 with the company initials joined to a thin Crate Ember
 * underline. No logo, no glyph, no mascot — per PRODUCT.md's anti-
 * references. Used in the sticky page header on every authenticated
 * surface and on the sign-in screen.
 */
export function Wordmark({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}): React.ReactElement {
  const scale =
    size === "sm" ? "text-[15px]" : size === "lg" ? "text-2xl" : "text-[17px]";
  return (
    <span className="inline-flex items-baseline gap-1.5 font-sans font-semibold text-soot">
      <span className={scale}>Curtis Crates</span>
      <span aria-hidden className="h-[3px] w-3 rounded-full bg-ember" />
    </span>
  );
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
