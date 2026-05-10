import Link from "next/link";
import type { Item } from "@/db/schema";
import type { Photo } from "@/domain/photo";

/**
 * Catalog grid. Server Component — receives a fully-resolved list of
 * items + a per-item cover photo URL (or null) so it can render without
 * any extra round-trips. Cards link to the item detail page.
 */
export interface CatalogListProps {
  items: ReadonlyArray<Item & { categoryName: string | null }>;
  coverByItemId: Map<string, Photo>;
  blobBaseUrl: string | undefined;
}

export function CatalogList({
  items,
  coverByItemId,
  blobBaseUrl,
}: CatalogListProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
        No items match this filter.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        const cover = coverByItemId.get(item.id);
        const photoUrl =
          cover !== undefined && blobBaseUrl !== undefined
            ? `${blobBaseUrl.replace(/\/+$/, "")}/${cover.blobPath.replace(/^\/+/, "")}`
            : null;
        return (
          <li key={item.id}>
            <Link
              // SAFETY: dynamic route segment; typed-routes can't narrow.
              href={
                `/items/${item.id}` as Parameters<typeof Link>[0]["href"]
              }
              className="group block overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:border-blue-500 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
                {photoUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No photo
                  </div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusBadge(item.status)}`}
                >
                  {item.status}
                </span>
              </div>
              <div className="grid gap-0.5 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {item.categoryName ?? "Uncategorized"} ·{" "}
                  #{String(item.displayId).padStart(6, "0")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {firstAttribute(item.attributes as Record<string, unknown>)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {item.listPrice !== null
                    ? `$${item.listPrice}`
                    : item.cost !== null
                      ? `cost $${item.cost}`
                      : ""}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function statusBadge(status: string): string {
  switch (status) {
    case "stocked":
      return "bg-emerald-100 text-emerald-800";
    case "sold":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-slate-200 text-slate-800";
  }
}

function firstAttribute(attrs: Record<string, unknown>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return "—";
  const [k, v] = entries[0]!;
  return `${k}: ${String(v)}`;
}
