"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";

/**
 * Page-header user menu. Doubles as the secondary-navigation surface —
 * primary actions live in the header CTA (Crate Ember); everything else
 * (low-frequency nav + sign-out) lives here so the header stays a
 * single primary action plus an identity chip.
 *
 * The chip shows initials by default and expands to email at sm+. The
 * popover groups: identity, navigation links, then sign-out.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface UserMenuProps {
  email: string;
  /** Secondary navigation entries; rendered above sign-out. */
  links?: readonly NavLink[];
}

export function UserMenu({
  email,
  links = [],
}: UserMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (
        containerRef.current !== null &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = email
    .split("@")[0]!
    .split(/[._-]/)
    .map((s) => s.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
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
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%_+_6px)] z-30 w-64 overflow-hidden rounded-lg border border-hairline bg-kraft shadow-[0_4px_16px_oklch(22%_0.008_60_/_0.10),0_12px_32px_oklch(22%_0.008_60_/_0.08)]"
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
                  onClick={() => setOpen(false)}
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
        </div>
      ) : null}
    </div>
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
