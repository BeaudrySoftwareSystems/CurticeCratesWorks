import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";
import { QuickSaleForm } from "@/components/sale/QuickSaleForm";

export const dynamic = "force-dynamic";

/**
 * Quick-record-sale entry point (R11). The form bypasses category-attribute
 * validation entirely — this is the cold-start escape hatch for items that
 * never went through proper intake.
 */
export default async function QuickSalePage(): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  const categories = await new CategoryRepository(getDb()).list();

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Cold-start path
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Record sale of an uninbound item
        </h1>
        <p className="text-sm text-slate-500">
          Use this when a sale happens for an item that was never logged
          through intake. The record will be flagged as <em>intake skipped</em>
          so it&apos;s distinguishable from full-lifecycle sold items.
        </p>
      </header>
      <QuickSaleForm categories={categories} />
    </main>
  );
}
