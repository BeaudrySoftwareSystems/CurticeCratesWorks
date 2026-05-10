import type { ReactNode } from "react";

/**
 * Typography primitives carrying the DESIGN.md scale + weight contract.
 *
 * Display  — clamp(2rem, 5vw, 3rem) / 600 / 1.05  page hero only
 * Headline — 24px / 600 / 1.2                     section headers
 * Title    — 18px / 500 / 1.3                     card + dialog titles
 * Body     — 15–16px / 400 / 1.45                 prose, attribute values
 * Label    — 11–12px / 500 / uppercase / 0.04em   field labels, badges
 *
 * Numerics use the `tabular` utility (Geist Mono + tnum) defined in
 * globals.css. Wrap any user-visible numeric in `<Tabular>` so prices,
 * SKUs, counts, and dates align cleanly in dense layouts.
 */

interface TextProps {
  children: ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

function compose(base: string, override?: string): string {
  return override === undefined ? base : `${base} ${override}`;
}

export function Display({
  children,
  className,
  as: As = "h1",
}: TextProps): React.ReactElement {
  return (
    <As
      className={compose(
        "font-sans font-semibold leading-[1.05] text-soot text-[clamp(2rem,5vw,3rem)] tracking-[-0.01em]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Headline({
  children,
  className,
  as: As = "h2",
}: TextProps): React.ReactElement {
  return (
    <As
      className={compose(
        "font-sans text-2xl font-semibold leading-tight text-soot tracking-[-0.005em]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Title({
  children,
  className,
  as: As = "h3",
}: TextProps): React.ReactElement {
  return (
    <As
      className={compose(
        "font-sans text-lg font-medium leading-snug text-soot",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Label({
  children,
  className,
  as: As = "span",
  htmlFor,
}: TextProps & { htmlFor?: string }): React.ReactElement {
  if (As === "label") {
    return (
      <label
        htmlFor={htmlFor}
        className={compose(
          "font-sans text-[11px] font-medium uppercase tracking-[0.06em] text-driftwood",
          className,
        )}
      >
        {children}
      </label>
    );
  }
  return (
    <As
      className={compose(
        "font-sans text-[11px] font-medium uppercase tracking-[0.06em] text-driftwood",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Body({
  children,
  className,
  as: As = "p",
}: TextProps): React.ReactElement {
  return (
    <As
      className={compose(
        "font-sans text-[15px] leading-relaxed text-soot",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Caption({
  children,
  className,
  as: As = "p",
}: TextProps): React.ReactElement {
  return (
    <As
      className={compose("font-sans text-[13px] text-driftwood", className)}
    >
      {children}
    </As>
  );
}

export function Tabular({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return <span className={compose("tabular", className)}>{children}</span>;
}
