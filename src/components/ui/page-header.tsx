import Link from "next/link";
import type { ReactNode } from "react";
import { UserMenu, type NavLink } from "./user-menu";
import { Wordmark } from "./wordmark";

/**
 * Sticky top header used on every authenticated page. Layout follows
 * the 80/20 rule:
 *   - Wordmark (identity, low visual weight) on the left
 *   - One optional primary CTA in the center-right (Crate Ember;
 *     surfaces the page's most-frequent action — e.g. "New intake"
 *     on the catalog)
 *   - UserMenu chip on the right with secondary nav + sign-out
 *
 * Pages that have no obvious primary action (item detail, intake form,
 * quick-sale) omit the CTA — the chip is enough.
 */
export function PageHeader({
  cta,
  email,
  navLinks,
}: {
  cta?: ReactNode;
  email?: string;
  navLinks?: readonly NavLink[];
}): React.ReactElement {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-kraft/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={{ pathname: "/" }}
          className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/50"
        >
          <Wordmark size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          {cta}
          {email !== undefined ? (
            <UserMenu email={email} {...(navLinks !== undefined ? { links: navLinks } : {})} />
          ) : null}
        </div>
      </div>
    </header>
  );
}

/**
 * The standard secondary-navigation set surfaced through every header's
 * UserMenu. Centralized so all pages stay consistent.
 */
export const STANDARD_NAV_LINKS: readonly NavLink[] = [
  { label: "Record uninbound sale", href: "/quick-sale" },
  { label: "Manage categories", href: "/admin/categories" },
  { label: "JADENS print test", href: "/print-test" },
];
