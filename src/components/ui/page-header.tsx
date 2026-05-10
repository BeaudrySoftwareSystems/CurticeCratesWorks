import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "./wordmark";

/**
 * Sticky top header used on every authenticated page. Carries the
 * Wordmark on the left, optional contextual children on the right
 * (typically a CTA). Sits on the Kraft surface with a 1px Hairline
 * border-bottom — flat, no shadow at rest.
 */
export function PageHeader({
  right,
}: {
  right?: ReactNode;
}): React.ReactElement {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-kraft/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={{ pathname: "/" }}
          className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/50"
        >
          <Wordmark />
        </Link>
        {right !== undefined ? (
          <div className="flex items-center gap-2">{right}</div>
        ) : null}
      </div>
    </header>
  );
}
