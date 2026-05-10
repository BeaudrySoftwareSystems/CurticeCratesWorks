import { redirect } from "next/navigation";
import { del, get, put } from "@vercel/blob";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository, type ListFilter } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";
import { CatalogList } from "@/components/catalog/CatalogList";
import { FilterBar } from "@/components/catalog/FilterBar";
import { LinkButton } from "@/components/ui/button";
import { PageHeader, STANDARD_NAV_LINKS } from "@/components/ui/page-header";
import { Display, Label, Tabular } from "@/components/ui/typography";
import type { ItemStatus } from "@/domain/item";
import type { Photo } from "@/domain/photo";
import { BlobGateway } from "@/gateways/blob.gateway";

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

  // Compose every cover photo URL from the configured public store base.
  // getPhotoUrl returns null when BLOB_STORE_BASE_URL is unset — render
  // a "no photo" placeholder rather than crashing the whole catalog.
  const blobs = new BlobGateway({ get, put, del });
  const coverUrlByItemId = new Map<string, string>();
  for (const [itemId, photo] of coverByItemId.entries()) {
    const url = blobs.getPhotoUrl(photo.blobPath);
    if (url !== null) {
      coverUrlByItemId.set(itemId, url);
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
        email={session.user.email ?? undefined}
        navLinks={STANDARD_NAV_LINKS}
        cta={
          <LinkButton href="/intake" variant="primary">
            New intake
          </LinkButton>
        }
      />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
        <header className="grid gap-3">
          <Label>Catalog</Label>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Display>Inventory</Display>
            <p className="font-sans text-[13px] text-driftwood">
              <Tabular>{items.length}</Tabular>{" "}
              {items.length === 1 ? "item" : "items"} ·{" "}
              <span className="text-soot">{statusLabel(statusParam)}</span>
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
          coverUrlByItemId={coverUrlByItemId}
          emptyState={<CatalogEmptyState filter={statusParam} />}
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

function CatalogEmptyState({
  filter,
}: {
  filter: string;
}): React.ReactElement {
  // Surface the most relevant CTA for the active filter so the user
  // doesn't have to hunt — the header CTA only handles "New intake".
  if (filter === "sold") {
    return (
      <div className="grid gap-3 py-2 text-left">
        <p className="font-sans text-[15px] text-soot">No sold items yet.</p>
        <p className="font-sans text-[13px] text-driftwood">
          Record a sale that didn&apos;t go through intake, or wait for
          stocked items to ship.
        </p>
        <div className="pt-2">
          <LinkButton href="/quick-sale" variant="primary">
            Record uninbound sale
          </LinkButton>
        </div>
      </div>
    );
  }
  if (filter === "archived") {
    return (
      <div className="py-2 text-left">
        <p className="font-sans text-[15px] text-soot">
          Nothing archived. Items move here when you remove them from the
          active catalog.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 py-2 text-left">
      <p className="font-sans text-[15px] text-soot">
        Nothing in stock yet.
      </p>
      <p className="font-sans text-[13px] text-driftwood">
        Start an intake to add the first item.
      </p>
      <div className="pt-2">
        <LinkButton href="/intake" variant="primary">
          New intake
        </LinkButton>
      </div>
    </div>
  );
}
