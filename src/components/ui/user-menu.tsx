"use client";

import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";

/**
 * Page-header user menu. Shows the operator's email as a tappable chip
 * that opens a small popover with the sign-out form. The form posts
 * directly to the Server Action so the menu stays useful even with JS
 * disabled (the popover just stays closed).
 *
 * Closes on outside click and on Escape — same affordances the native
 * <dialog> menus elsewhere in the app use.
 */
export function UserMenu({
  email,
}: {
  email: string;
}): React.ReactElement {
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
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-hairline bg-paper px-2.5 py-1.5 font-sans text-[13px] text-soot transition-colors hover:border-edge hover:bg-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
      >
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full bg-ember font-mono text-[10px] font-semibold text-bone"
        >
          {initials}
        </span>
        <span className="hidden sm:inline">{email}</span>
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
            <span className="font-sans text-[13px] text-soot">{email}</span>
          </div>
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
