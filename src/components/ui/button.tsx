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

/**
 * Button vocabulary tuned to the Curtice Crates editorial / craftsman
 * brand without sacrificing warehouse-floor legibility:
 *   - Slightly squared corners (rounded-sm) suggest letterpress, not
 *     SaaS pill.
 *   - Tactile shadow stack: a subtle inner top highlight + soft
 *     drop shadow give the surface a "pressed" feel without crossing
 *     into glassmorphism or skeuomorphism.
 *   - Hairline ember-deep border defines the primary edge against
 *     warm Kraft headers where the ember-on-kraft contrast can blur.
 *   - Active state: removes the lift + shadow so the press registers.
 */
const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-sm px-5 text-[15px] font-medium tracking-[0.005em] transition-[background-color,box-shadow,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bone disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

const VARIANTS: Record<Variant, string> = {
  primary:
    // 1px ember-deep border + inset top highlight + soft warm bottom shadow.
    // Hover: deepen the fill; active: press into the surface (lose shadow).
    "border border-[oklch(50%_0.18_40)] bg-ember text-bone shadow-[inset_0_1px_0_oklch(80%_0.10_40_/_0.55),0_1px_2px_oklch(35%_0.15_40_/_0.25),0_2px_6px_oklch(35%_0.15_40_/_0.18)] hover:bg-ember-deep hover:shadow-[inset_0_1px_0_oklch(78%_0.10_40_/_0.45),0_1px_2px_oklch(35%_0.15_40_/_0.25)] active:translate-y-px active:shadow-[inset_0_1px_0_oklch(40%_0.16_40_/_0.30)]",
  secondary:
    "border border-edge bg-paper text-soot shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.6)] hover:border-driftwood hover:bg-kraft active:translate-y-px",
  destructive:
    "border border-[oklch(50%_0.16_25)] bg-signal text-bone shadow-[inset_0_1px_0_oklch(78%_0.10_25_/_0.5),0_1px_2px_oklch(35%_0.16_25_/_0.25)] hover:bg-[oklch(50%_0.18_25)] active:translate-y-px active:shadow-none",
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
