"use client";

import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { Popover } from "./popover";

/**
 * Page-header user menu. Doubles as the secondary-navigation surface —
 * primary actions live in the header CTA (Crate Ember); everything else
 * (low-frequency nav + sign-out) lives here so the header stays a
 * single primary action plus an identity chip.
 *
 * The chip shows initials + (at sm+) the truncated email. Popover
 * groups: identity, navigation links, then sign-out. Click-outside,
 * Escape, ARIA wiring all delegated to the Popover primitive.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface UserMenuProps {
  email: string;
  links?: readonly NavLink[];
}

export function UserMenu({
  email,
  links = [],
}: UserMenuProps): React.ReactElement {
  const initials = email
    .split("@")[0]!
    .split(/[._-]/)
    .map((s) => s.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Popover
      role="menu"
      align="end"
      panelClassName="w-64"
      trigger={({ triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label="Account menu"
          className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-hairline bg-paper px-1 font-sans text-[13px] text-soot transition-colors hover:border-edge hover:bg-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ember font-mono text-[10px] font-semibold text-bone"
          >
            {initials}
          </span>
          <span className="hidden pr-2 sm:inline">{shortEmail(email)}</span>
        </button>
      )}
    >
      <div className="grid gap-0.5 border-b border-hairline px-3 py-2.5">
        <span className="font-sans text-[10px] uppercase tracking-[0.08em] text-driftwood">
          Signed in as
        </span>
        <span className="break-words font-sans text-[13px] text-soot">
          {email}
        </span>
      </div>
      {links.length > 0 ? (
        <div className="grid border-b border-hairline">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href as Parameters<typeof Link>[0]["href"]}
              className="flex items-center justify-between px-3 py-3 font-sans text-[14px] text-soot transition-colors hover:bg-paper focus:outline-none focus-visible:bg-paper"
            >
              <span>{link.label}</span>
              <span aria-hidden className="text-driftwood">
                →
              </span>
            </Link>
          ))}
        </div>
      ) : null}
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-between px-3 py-3 font-sans text-[14px] text-soot transition-colors hover:bg-paper focus:outline-none focus-visible:bg-paper"
        >
          <span>Sign out</span>
          <span aria-hidden className="text-driftwood">
            →
          </span>
        </button>
      </form>
    </Popover>
  );
}

/**
 * Truncate the email at the `@` for the chip — full address still appears
 * inside the popover. Keeps the header chip a fixed visual weight even
 * when the email gets long.
 */
function shortEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.length > 14 ? `${local.slice(0, 14)}…` : local;
}
