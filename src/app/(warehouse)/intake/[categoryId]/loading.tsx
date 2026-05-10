import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Intake-form skeleton. The form host creates a draft item server-side
 * before render, so this typically appears for the duration of one DB
 * round-trip — kept minimal accordingly.
 */
export default function IntakeFormLoading(): React.ReactElement {
  return (
    <>
      <PageHeader />
      <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-44" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ))}
      </main>
    </>
  );
}
