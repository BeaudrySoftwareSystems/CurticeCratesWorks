import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";
import { QuickSaleForm } from "@/components/sale/QuickSaleForm";
import { PageHeader, STANDARD_NAV_LINKS } from "@/components/ui/page-header";
import { Display, Label } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

/**
 * Quick-record-sale entry point (R11). The form bypasses category-
 * attribute validation entirely — this is the cold-start escape hatch
 * for items that never went through proper intake.
 */
export default async function QuickSalePage(): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  const categories = await new CategoryRepository(getDb()).list();

  return (
    <>
      <PageHeader
        email={session.user.email ?? undefined}
        navLinks={STANDARD_NAV_LINKS}
      />
      <main className="mx-auto grid max-w-3xl gap-7 px-4 py-8">
        <header className="grid gap-3">
          <Label>Cold-start path</Label>
          <Display>Record uninbound sale</Display>
          <p className="font-sans text-[14px] leading-relaxed text-driftwood">
            For items sold without going through intake. The record is
            flagged{" "}
            <span className="rounded bg-lantern/20 px-1.5 py-px font-mono text-[12px] text-[oklch(40%_0.10_75)]">
              intake skipped
            </span>{" "}
            so it stays distinguishable from full-lifecycle sold items.
          </p>
        </header>
        <QuickSaleForm categories={categories} />
      </main>
    </>
  );
}
