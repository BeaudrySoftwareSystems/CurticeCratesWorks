import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The button vocabulary. Three variants — `primary` (Crate Ember; one per
 * screen per the One-Voice Rule), `secondary` (neutral border, no fill),
 * and `destructive` (Signal Red, used by Archive). Sizes default to the
 * 48×48 thumb-zone minimum.
 *
 * The `<LinkButton>` mirrors the same styling for `<a>` elements when a
 * Next `<Link>` needs to look like a button (e.g. catalog header CTAs).
 */

type Variant = "primary" | "secondary" | "destructive";

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bone disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ember text-bone shadow-[0_1px_0_oklch(45%_0.18_40)] hover:bg-ember-deep active:translate-y-px",
  secondary:
    "border border-edge bg-paper text-soot hover:border-driftwood hover:bg-kraft",
  destructive:
    "bg-signal text-bone hover:bg-[oklch(50%_0.18_25)] active:translate-y-px",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "secondary",
  className,
  children,
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      {...rest}
      className={`${BASE} ${VARIANTS[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function LinkButton({
  variant = "secondary",
  className,
  children,
  ...rest
}: LinkButtonProps): React.ReactElement {
  return (
    <a
      {...rest}
      className={`${BASE} ${VARIANTS[variant]} ${className ?? ""}`}
    >
      {children}
    </a>
  );
}
