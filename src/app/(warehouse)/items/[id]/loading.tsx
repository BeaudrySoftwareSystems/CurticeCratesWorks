import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Item-detail skeleton. Covers the four real sections (header, photos,
 * attributes, details) so the eye lands on the same shape before
 * Drizzle returns. Photos are rendered as a 2-up grid since most items
 * have at least one cover.
 */
export default function ItemDetailLoading(): React.ReactElement {
  return (
    <>
      <PageHeader />
      <main className="mx-auto grid max-w-3xl gap-7 px-4 py-8">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-3 w-16" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="aspect-square w-full" />
          </div>
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-3 w-20" />
          <div className="grid gap-2 rounded-lg border border-hairline bg-paper p-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-3 w-16" />
          <div className="grid gap-2 rounded-lg border border-hairline bg-paper p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </main>
    </>
  );
}
