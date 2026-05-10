import Link from "next/link";
import type { Item, Sale } from "@/db/schema";
import type { Category } from "@/domain/category";
import type { Photo } from "@/domain/photo";
import { ArchiveDialog } from "@/components/item/ArchiveDialog";
import { MarkSoldDialog } from "@/components/item/MarkSoldDialog";

/**
 * Server Component that renders item detail. Wires the Mark Sold and
 * Archive Client Components based on the item's current status:
 *   stocked  → Mark Sold + Archive
 *   sold     → Archive only
 *   archived → no actions
 *
 * The Reprint Label CTA lands in Unit 11 (Phase 4); the markup includes
 * a placeholder slot so the layout doesn't shift when it arrives.
 */
export interface ItemDetailProps {
  item: Item;
  category: Category | null;
  photos: readonly Photo[];
  sale: Sale | null;
  blobBaseUrl: string | undefined;
}

export function ItemDetail({
  item,
  category,
  photos,
  sale,
  blobBaseUrl,
}: ItemDetailProps): React.ReactElement {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link
          href={{ pathname: "/" }}
          className="text-sm text-slate-500 hover:text-blue-600"
        >
          ← Catalog
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {category?.name ?? "Item"} #
            {String(item.displayId).padStart(6, "0")}
          </h1>
          <StatusBadge status={item.status} />
        </div>
      </header>

      {photos.length > 0 && blobBaseUrl !== undefined ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Photos
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p) => (
              <li
                key={p.id}
                className="aspect-square overflow-hidden rounded-md border border-slate-200 dark:border-slate-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${blobBaseUrl.replace(/\/+$/, "")}/${p.blobPath.replace(/^\/+/, "")}`}
                  alt={p.caption ?? "Item photo"}
                  className="h-full w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Attributes
        </h2>
        <AttributesTable attrs={item.attributes as Record<string, unknown>} />
      </section>

      <section className="grid gap-1 text-sm">
        <Field label="Location" value={item.location ?? "—"} />
        <Field
          label="Cost"
          value={item.cost !== null ? `$${item.cost}` : "—"}
        />
        <Field
          label="List price"
          value={item.listPrice !== null ? `$${item.listPrice}` : "—"}
        />
        {sale !== null ? (
          <>
            <Field label="Sold price" value={`$${sale.soldPrice}`} />
            <Field
              label="Sold date"
              value={sale.soldAt.toISOString().slice(0, 10)}
            />
            <Field label="Platform" value={sale.platform ?? "(unknown)"} />
            {sale.buyerReference !== null ? (
              <Field label="Buyer" value={sale.buyerReference} />
            ) : null}
          </>
        ) : null}
      </section>

      <ActionsBar
        itemId={item.id}
        status={item.status}
        listPrice={item.listPrice}
      />
    </div>
  );
}

function ActionsBar({
  itemId,
  status,
  listPrice,
}: {
  itemId: string;
  status: string;
  listPrice: string | null;
}): React.ReactElement | null {
  if (status === "archived") {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
        Archived — no further actions.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
      {status === "stocked" ? (
        <MarkSoldDialog itemId={itemId} defaultListPrice={listPrice} />
      ) : null}
      <ArchiveDialog itemId={itemId} />
    </div>
  );
}

function AttributesTable({
  attrs,
}: {
  attrs: Record<string, unknown>;
}): React.ReactElement {
  const entries = Object.entries(attrs);
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No attributes set.</p>;
  }
  return (
    <dl className="grid gap-1 text-sm">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800"
        >
          <dt className="text-slate-500">{k}</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}): React.ReactElement {
  const cls =
    status === "stocked"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : status === "sold"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
        : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}
