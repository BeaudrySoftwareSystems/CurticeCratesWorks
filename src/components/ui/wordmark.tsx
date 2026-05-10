import Image from "next/image";

/**
 * The Curtice Crates wordmark — the system's only identity signal.
 *
 * Renders the brand logo (`public/brand/curtice_crates.png`). The PNG
 * has a white background; `mix-blend-mode: multiply` drops the white
 * so the warm Kraft / Bone surface shows through cleanly.
 *
 * Sizes:
 *   sm — 32px tall · sticky header at very narrow viewports
 *   md — 40px tall · default header
 *   lg — 96px tall · sign-in / not-found / error pages
 */
export function Wordmark({
  size = "md",
  priority = false,
}: {
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}): React.ReactElement {
  const px = size === "sm" ? 32 : size === "lg" ? 96 : 40;
  return (
    <Image
      src="/brand/curtice_crates.png"
      alt="Curtice Crates"
      width={px}
      height={px}
      priority={priority || size === "lg"}
      // The source PNG is a square logotype on a white background. The
      // multiply blend lets the surface tone show through the white,
      // keeps the orange wordmark + ornament intact, and respects the
      // page's color palette without us needing a transparent variant.
      className="h-auto select-none object-contain mix-blend-multiply"
      unoptimized
    />
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
