import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository, type ListFilter } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";
import { CatalogList } from "@/components/catalog/CatalogList";
import { FilterBar } from "@/components/catalog/FilterBar";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Display, Label, Tabular } from "@/components/ui/typography";
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
 * fetch — so the URL is always source of truth.
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
    <>
      <PageHeader
        right={
          <>
            <LinkButton href="/quick-sale">Record uninbound sale</LinkButton>
            <LinkButton href="/intake" variant="primary">
              New intake
            </LinkButton>
          </>
        }
      />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
        <header className="grid gap-3">
          <Label>Catalog</Label>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Display>Inventory</Display>
            <p className="font-sans text-[13px] text-driftwood">
              <Tabular>{items.length}</Tabular>{" "}
              {items.length === 1 ? "item" : "items"} · {statusLabel(statusParam)}
              {" · "}
              <span className="text-soot">{session.user.email}</span>
            </p>
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
          emptyState={
            <div className="grid gap-3 py-2">
              <p className="font-sans text-[14px] text-soot">
                Nothing {statusParam === "all" ? "" : statusLabel(statusParam).toLowerCase()} here yet.
              </p>
              <p className="font-sans text-[13px] text-driftwood">
                Start an intake to add the first item, or record a sale of
                an item that never went through the system.
              </p>
            </div>
          }
        />
      </main>
    </>
  );
}

function statusLabel(s: string): string {
  switch (s) {
    case "stocked":
      return "Stocked";
    case "sold":
      return "Sold";
    case "archived":
      return "Archived";
    default:
      return "All statuses";
  }
}
