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
    ornament: "h-[8px] w-10",
    tagline: null,
    gap: "gap-2",
    layout: "inline" as const,
  },
  md: {
    word: "text-[28px] leading-none",
    ornament: "h-[7px] w-16",
    tagline: null,
    gap: "gap-1",
    layout: "stacked" as const,
  },
  lg: {
    word: "text-[56px] leading-none",
    ornament: "h-3 w-32",
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
 * Symmetric wheat sprig ornament. Uses CSS `currentColor` so it picks
 * up the parent's `text-ember`. Drawn as a horizontal stem with grain
 * ovals angled off both sides — visually evokes the original brand
 * mark without being a literal trace.
 */
function WheatOrnament({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 120 16"
      xmlns="http://www.w3.org/2000/svg"
      className={`block ${className ?? ""}`}
      aria-hidden
      role="presentation"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* horizontal stem */}
      <line
        x1="6"
        y1="8"
        x2="114"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* outer flourish points */}
      <circle cx="3" cy="8" r="1.6" fill="currentColor" />
      <circle cx="117" cy="8" r="1.6" fill="currentColor" />
      {/* grains: top row tilted up, bottom row tilted down, mirrored
          across the vertical center axis for symmetry */}
      {[40, 60, 80].map((cx) => {
        const tiltUp = cx === 60 ? 0 : cx < 60 ? -28 : 28;
        const tiltDown = cx === 60 ? 0 : cx < 60 ? 28 : -28;
        return (
          <g key={cx}>
            <ellipse
              cx={cx}
              cy="4"
              rx="3.4"
              ry="1.4"
              fill="currentColor"
              transform={`rotate(${tiltUp} ${cx} 4)`}
            />
            <ellipse
              cx={cx}
              cy="12"
              rx="3.4"
              ry="1.4"
              fill="currentColor"
              transform={`rotate(${tiltDown} ${cx} 12)`}
            />
          </g>
        );
      })}
    </svg>
  );
}
