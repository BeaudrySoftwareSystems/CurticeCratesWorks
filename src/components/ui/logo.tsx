/**
 * The Curtice Crates logo, code-rendered.
 *
 * Replaces the earlier PNG asset (which had a hard white background and
 * had to be hacked through `mix-blend-multiply` + a clipped header). This
 * version is real text in Playfair Display Italic plus a small inline
 * SVG wheat sprig — crisp at every size, themeable, and ~zero bytes
 * over the wire.
 *
 * Layout adapts to size so the same component works for both the sticky
 * header and the auth-page hero:
 *   - sm — inline single line (`Curtice ⌇ Crates`). Stays under ~28px
 *     tall so the sticky header doesn't bloat.
 *   - md — stacked two-line wordmark with the ornament between.
 *   - lg — stacked plus the "FAMILY OWNED · CURATED" tagline below.
 */
export interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PRESETS = {
  sm: {
    word: "text-[20px] leading-none",
    ornament: "h-3 w-12",
    tagline: null,
    gap: "gap-2.5",
    layout: "inline" as const,
  },
  md: {
    word: "text-[28px] leading-none",
    ornament: "h-3 w-20",
    tagline: null,
    gap: "gap-1",
    layout: "stacked" as const,
  },
  lg: {
    word: "text-[56px] leading-none",
    ornament: "h-5 w-40",
    tagline: "text-[12px] tracking-[0.24em]",
    gap: "gap-2",
    layout: "stacked" as const,
  },
} as const;

export function Logo({
  size = "md",
  className,
}: LogoProps): React.ReactElement {
  const preset = PRESETS[size];

  if (preset.layout === "inline") {
    return (
      <span
        className={`inline-flex items-center text-ember ${preset.gap} ${className ?? ""}`}
        aria-label="Curtice Crates"
        role="img"
      >
        <Word className={preset.word}>Curtice</Word>
        <WheatOrnament className={preset.ornament} />
        <Word className={preset.word}>Crates</Word>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex flex-col items-center text-ember ${preset.gap} ${className ?? ""}`}
      aria-label="Curtice Crates"
      role="img"
    >
      <Word className={preset.word}>Curtice</Word>
      <WheatOrnament className={preset.ornament} />
      <Word className={preset.word}>Crates</Word>
      {preset.tagline !== null ? (
        <span
          className={`mt-1 font-sans font-medium uppercase ${preset.tagline}`}
          aria-hidden
        >
          Family Owned · Curated
        </span>
      ) : null}
    </span>
  );
}

function Word({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}): React.ReactElement {
  return (
    <span
      className={`font-serif italic font-semibold tracking-tight ${className}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

/**
 * Symmetric wheat ornament. Stylized rather than literal — at 40×8 px
 * (the inline-header size) the original detailed sprig collapsed into
 * an unreadable smudge. This version uses chunky strokes and a
 * compact 32×10 viewBox so each visual element maps to ≥1.5 px of
 * actual screen space at the smallest size we render.
 *
 * Anatomy: a thin horizontal stem flanked by chevron-shaped wheat
 * heads on each side, with a small filled diamond at the center as
 * the visual fulcrum. Uses `currentColor` so it inherits the parent's
 * ember.
 */
function WheatOrnament({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 32 10"
      xmlns="http://www.w3.org/2000/svg"
      className={`block ${className ?? ""}`}
      aria-hidden
      role="presentation"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* horizontal stem */}
      <line x1="3" y1="5" x2="29" y2="5" strokeWidth="0.8" />

      {/* end caps */}
      <circle cx="2" cy="5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="30" cy="5" r="0.9" fill="currentColor" stroke="none" />

      {/* left wheat head — chevron pointing inward */}
      <path d="M 7 2.5 L 11 5 L 7 7.5" strokeWidth="1" />

      {/* right wheat head — chevron pointing inward */}
      <path d="M 25 2.5 L 21 5 L 25 7.5" strokeWidth="1" />

      {/* center diamond fulcrum */}
      <path
        d="M 16 2.6 L 18 5 L 16 7.4 L 14 5 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
