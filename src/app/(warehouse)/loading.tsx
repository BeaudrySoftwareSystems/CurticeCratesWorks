import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Display, Label } from "@/components/ui/typography";

/**
 * Catalog skeleton — mirrors the real catalog grid so the eye lands
 * on the same structure before the photos and prices arrive. The
 * UserMenu is omitted (no email available pre-fetch); the rest of the
 * shell is identical.
 */
export default function CatalogLoading(): React.ReactElement {
  return (
    <>
      <PageHeader />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
        <header className="grid gap-3">
          <Label>Catalog</Label>
          <Display>Inventory</Display>
        </header>
        <div className="rounded-lg border border-hairline bg-paper px-3 py-3">
          <div className="flex flex-wrap items-end gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="overflow-hidden rounded-lg border border-hairline bg-kraft"
            >
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="grid gap-1.5 px-3 py-2.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
