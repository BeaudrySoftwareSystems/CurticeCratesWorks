import { LinkButton } from "@/components/ui/button";
import { Caption, Display, Label } from "@/components/ui/typography";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * Global not-found. Used by Next when no route matches and by
 * `notFound()` calls inside Server Components when no route-local
 * not-found.tsx is present.
 */
export default function NotFound(): React.ReactElement {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md grid-rows-[auto_1fr_auto] gap-10 px-5 py-8">
      <div>
        <Wordmark size="lg" />
      </div>
      <div className="grid gap-5 self-center">
        <Label>404</Label>
        <Display>Nothing here</Display>
        <Caption>
          The page you tried to load doesn&apos;t exist. It may have been
          renamed, or the link is wrong.
        </Caption>
        <div className="pt-2">
          <LinkButton href="/" variant="primary">
            Back to catalog
          </LinkButton>
        </div>
      </div>
      <Caption className="text-[12px] text-smoke">
        Curtis Crates internal
      </Caption>
    </main>
  );
}
