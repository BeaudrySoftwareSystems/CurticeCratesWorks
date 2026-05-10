import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesAdminLoading(): React.ReactElement {
  return (
    <>
      <PageHeader />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <ul className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-16 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
