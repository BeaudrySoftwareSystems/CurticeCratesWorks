import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository, type ListFilter } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";
import { CatalogList } from "@/components/catalog/CatalogList";
import { FilterBar } from "@/components/catalog/FilterBar";
import type { ItemStatus } from "@/domain/item";
import type { Photo } from "@/domain/photo";

export const dynamic = "force-dynamic";

const VALID_STATUSES: readonly ItemStatus[] = ["stocked", "sold", "archived"];

/**
 * Catalog home. Server Component:
 *   1. requires a session
 *   2. parses ?status= and ?category= from the URL
 *   3. fetches filtered items + categories + cover photos
 *   4. renders FilterBar (Client) + CatalogList (Server)
 *
 * Default view is `status=stocked`. Filtering is one-trip — no client
 * fetch — so the URL is always the source of truth and back/forward
 * navigation behaves as expected.
 */
export default async function CatalogHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  const sp = await searchParams;
  const statusParam = sp.status ?? "stocked";
  const categoryParam = sp.category ?? "";

  const filter: ListFilter = {};
  if ((VALID_STATUSES as readonly string[]).includes(statusParam)) {
    filter.status = statusParam as ItemStatus;
  }
  if (categoryParam !== "" && categoryParam !== "all") {
    filter.categoryId = categoryParam;
  }

  const db = getDb();
  const [items, categories] = await Promise.all([
    new ItemRepository(db).list(filter),
    new CategoryRepository(db).list(),
  ]);

  const photos = await new PhotoRepository(db).listForItems(
    items.map((i) => i.id),
  );
  const coverByItemId = new Map<string, Photo>();
  for (const p of photos) {
    if (!coverByItemId.has(p.itemId)) {
      coverByItemId.set(p.itemId, p);
    }
  }
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const itemsWithCategory = items.map((it) => ({
    ...it,
    categoryName:
      it.categoryId !== null
        ? (categoryNameById.get(it.categoryId) ?? null)
        : null,
  }));

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Curtis Crates catalog
          </h1>
          <p className="text-sm text-slate-500">
            Signed in as {session.user.email}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={{ pathname: "/quick-sale" }}
            className="flex min-h-12 items-center rounded-md border border-slate-300 bg-white px-4 text-base font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Record uninbound sale
          </Link>
          <Link
            href={{ pathname: "/intake" }}
            className="flex min-h-12 items-center rounded-md bg-blue-600 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            New intake
          </Link>
        </div>
      </header>
      <FilterBar
        categories={categories}
        currentStatus={statusParam}
        {...(categoryParam !== "" ? { currentCategoryId: categoryParam } : {})}
      />
      <CatalogList
        items={itemsWithCategory}
        coverByItemId={coverByItemId}
        blobBaseUrl={process.env["BLOB_STORE_BASE_URL"]}
      />
    </main>
  );
}
