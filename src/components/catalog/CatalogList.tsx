import Link from "next/link";
import type { Item } from "@/db/schema";
import type { Photo } from "@/domain/photo";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DisplayId } from "@/components/ui/wordmark";
import { Tabular } from "@/components/ui/typography";

/**
 * Catalog grid. Server Component — receives a fully-resolved list of
 * items + a per-item cover photo so it can render without extra round-
 * trips. Cards link to item detail.
 *
 * Per DESIGN.md: surface tone (Kraft over Bone) carries depth. No
 * resting shadow — the Hover Lift class only attaches on hover/focus.
 * Every numeric is wrapped in `<Tabular>` so the prices and IDs align
 * cleanly across rows.
 */
export interface CatalogListProps {
  items: ReadonlyArray<Item & { categoryName: string | null }>;
  coverByItemId: Map<string, Photo>;
  blobBaseUrl: string | undefined;
  emptyState?: React.ReactNode;
}

export function CatalogList({
  items,
  coverByItemId,
  blobBaseUrl,
  emptyState,
}: CatalogListProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-paper px-6 py-10 text-center">
        {emptyState ?? (
          <p className="font-sans text-[15px] text-driftwood">
            No items match this filter.
          </p>
        )}
      </div>
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
              className="group block overflow-hidden rounded-lg border border-hairline bg-kraft transition-shadow duration-150 hover:border-edge hover:shadow-[0_1px_2px_oklch(22%_0.008_60_/_0.06),0_4px_12px_oklch(22%_0.008_60_/_0.04)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
            >
              <div className="relative aspect-square w-full bg-paper">
                {photoUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-sans text-[11px] uppercase tracking-[0.08em] text-smoke">
                    No photo
                  </div>
                )}
                <span className="absolute right-2 top-2">
                  <StatusBadge status={item.status} />
                </span>
                {item.intakeSkipped ? (
                  <span className="absolute left-2 top-2">
                    <Badge tone="intake-skipped">intake skipped</Badge>
                  </span>
                ) : null}
              </div>
              <div className="grid gap-1 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-driftwood">
                    {item.categoryName ?? "Uncategorized"}
                  </span>
                  <DisplayId displayId={item.displayId} />
                </div>
                <p className="line-clamp-1 font-sans text-[14px] font-medium text-soot">
                  {firstAttribute(item.attributes as Record<string, unknown>)}
                </p>
                <PriceLine item={item} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PriceLine({
  item,
}: {
  item: Item;
}): React.ReactElement | null {
  if (item.listPrice !== null) {
    return (
      <p className="font-sans text-[13px] text-soot">
        <Tabular>${item.listPrice}</Tabular>
      </p>
    );
  }
  if (item.cost !== null) {
    return (
      <p className="font-sans text-[12px] text-driftwood">
        cost <Tabular>${item.cost}</Tabular>
      </p>
    );
  }
  return <p className="font-sans text-[12px] text-smoke">—</p>;
}

function firstAttribute(attrs: Record<string, unknown>): string {
  if (typeof attrs["title"] === "string" && attrs["title"] !== "") {
    return attrs["title"];
  }
  const entries = Object.entries(attrs);
  if (entries.length === 0) return "—";
  const [k, v] = entries[0]!;
  return `${k}: ${String(v)}`;
}
