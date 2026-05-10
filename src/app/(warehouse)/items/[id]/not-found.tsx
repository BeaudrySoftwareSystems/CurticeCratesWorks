import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Caption, Display, Label } from "@/components/ui/typography";

/**
 * Route-local not-found used when ItemRepository.findById returns null.
 * Keeps the warehouse chrome (PageHeader) so the operator can pivot
 * back to the catalog without re-orienting.
 */
export default function ItemNotFound(): React.ReactElement {
  return (
    <>
      <PageHeader />
      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-12">
        <Label>Item</Label>
        <Display>Not in the catalog</Display>
        <Caption>
          The item id in this URL doesn&apos;t match anything we&apos;ve
          recorded. It may have been archived and then permanently
          removed, or the link is wrong.
        </Caption>
        <div className="pt-2">
          <LinkButton href="/" variant="primary">
            Back to catalog
          </LinkButton>
        </div>
      </main>
    </>
  );
}
