import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuickSaleLoading(): React.ReactElement {
  return (
    <>
      <PageHeader />
      <main className="mx-auto grid max-w-3xl gap-7 px-4 py-8">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid gap-3">
            <Skeleton className="h-3 w-20" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
