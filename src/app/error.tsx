"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Caption, Display, Label } from "@/components/ui/typography";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * Global error boundary. Catches any unhandled error from a Server
 * Component, layout, or page render below the root layout. Voice is
 * matter-of-fact per PRODUCT.md: tell the operator what happened, give
 * them the two paths back, and surface the digest only as a small
 * trailing reference.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    // The Next.js convention is that the digest is reported by the
    // server-side logger; nothing to do here besides keep this hook so
    // future telemetry hooks (e.g. Sentry breadcrumbs) have a seam.
  }, [error]);

  return (
    <main className="mx-auto grid min-h-dvh max-w-md grid-rows-[auto_1fr_auto] gap-10 px-5 py-8">
      <div>
        <Wordmark size="lg" />
      </div>
      <div className="grid gap-5 self-center">
        <Label>Error</Label>
        <Display>Something failed</Display>
        <Caption>
          The page couldn&apos;t finish rendering. Try again, or head back
          to the catalog. If this keeps happening, share the reference
          below with the warehouse owner.
        </Caption>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="button" variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <LinkButton href="/">Back to catalog</LinkButton>
        </div>
        {error.digest !== undefined ? (
          <p className="font-mono text-[11px] text-smoke">
            ref · <span className="text-driftwood">{error.digest}</span>
          </p>
        ) : null}
      </div>
      <Caption className="text-[12px] text-smoke">
        Curtis Crates internal
      </Caption>
    </main>
  );
}
