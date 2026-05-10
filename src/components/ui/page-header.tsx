import Link from "next/link";
import type { ReactNode } from "react";
import { UserMenu } from "./user-menu";
import { Wordmark } from "./wordmark";

/**
 * Sticky top header used on every authenticated page. Wordmark on the
 * left, optional contextual children, then the UserMenu (sign-out) on
 * the right whenever a session email is provided. Sits on the Kraft
 * surface with a 1px Hairline border-bottom — flat at rest.
 */
export function PageHeader({
  right,
  email,
}: {
  right?: ReactNode;
  email?: string;
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
        <div className="flex items-center gap-2">
          {right}
          {email !== undefined ? <UserMenu email={email} /> : null}
        </div>
      </div>
    </header>
  );
}
