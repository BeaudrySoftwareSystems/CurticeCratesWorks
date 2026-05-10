import Link from "next/link";
import type { Item, Sale } from "@/db/schema";
import type { Category } from "@/domain/category";
import type { Photo } from "@/domain/photo";
import { ArchiveDialog } from "@/components/item/ArchiveDialog";
import { MarkSoldDialog } from "@/components/item/MarkSoldDialog";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Headline, Label, Tabular, Title } from "@/components/ui/typography";
import { DisplayId } from "@/components/ui/wordmark";

/**
 * Item detail. Server Component. Wires the Mark Sold and Archive Client
 * Components based on current status. The Reprint Label CTA lands in
 * Unit 11 (Phase 4); the markup keeps a placeholder slot so the layout
 * stays stable when it ships.
 */
export interface ItemDetailProps {
  item: Item;
  category: Category | null;
  photos: readonly Photo[];
  /**
   * URL per photo (same length, same order). Resolved upstream via
   * BlobGateway.getPhotoUrls so private blobs work — null entries
   * indicate a photo whose blob couldn't be resolved (deleted, expired,
   * etc.) and are skipped in the render.
   */
  photoUrls: readonly (string | null)[];
  sale: Sale | null;
}

export function ItemDetail({
  item,
  category,
  photos,
  photoUrls,
  sale,
}: ItemDetailProps): React.ReactElement {
  return (
    <div className="grid gap-7">
      <header className="grid gap-3">
        <Link
          href={{ pathname: "/" }}
          className="inline-flex w-fit items-center gap-1.5 font-sans text-[13px] text-driftwood transition-colors hover:text-soot"
        >
          <span aria-hidden>←</span>
          Catalog
        </Link>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <DisplayId displayId={item.displayId} />
            <StatusBadge status={item.status} />
          </div>
          <Headline>{category?.name ?? "Item"}</Headline>
          {item.intakeSkipped ? (
            <Badge tone="intake-skipped">intake skipped</Badge>
          ) : null}
        </div>
      </header>

      {photos.length > 0 ? (
        <section className="grid gap-3">
          <Label>Photos</Label>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p, i) => {
              const url = photoUrls[i];
              if (url === null || url === undefined) return null;
              return (
                <li
                  key={p.id}
                  className="aspect-square overflow-hidden rounded-md border border-hairline bg-paper"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={p.caption ?? "Item photo"}
                    className="h-full w-full object-cover"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-3">
        <Label>Attributes</Label>
        <AttributesTable attrs={item.attributes as Record<string, unknown>} />
      </section>

      <section className="grid gap-3">
        <Label>Details</Label>
        <dl className="grid gap-0 overflow-hidden rounded-lg border border-hairline bg-paper">
          <Field label="Location" value={item.location ?? "—"} />
          <Field
            label="Cost"
            value={item.cost !== null ? `$${item.cost}` : "—"}
            mono
          />
          <Field
            label="List price"
            value={item.listPrice !== null ? `$${item.listPrice}` : "—"}
            mono
          />
          {sale !== null ? (
            <>
              <Field
                label="Sold price"
                value={`$${sale.soldPrice}`}
                mono
                emphasis
              />
              <Field
                label="Sold date"
                value={sale.soldAt.toISOString().slice(0, 10)}
                mono
              />
              <Field label="Platform" value={sale.platform ?? "(unknown)"} />
              {sale.buyerReference !== null ? (
                <Field label="Buyer" value={sale.buyerReference} />
              ) : null}
            </>
          ) : null}
        </dl>
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
      <p className="rounded-md border border-dashed border-edge bg-paper px-3 py-3 text-center font-sans text-[13px] text-driftwood">
        Archived. No further actions.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
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
    return (
      <p className="font-sans text-[13px] text-driftwood">
        No attributes set.
      </p>
    );
  }
  return (
    <dl className="grid gap-0 overflow-hidden rounded-lg border border-hairline bg-paper">
      {entries.map(([k, v]) => (
        <Field key={k} label={k} value={String(v)} />
      ))}
    </dl>
  );
}

function Field({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-3 py-2.5 last:border-b-0">
      <dt className="font-sans text-[12px] uppercase tracking-[0.06em] text-driftwood">
        {label}
      </dt>
      <dd
        className={`text-right font-sans ${emphasis ? "text-[15px] font-medium" : "text-[14px]"} text-soot`}
      >
        {mono ? <Tabular>{value}</Tabular> : value}
      </dd>
    </div>
  );
}

// Re-export so legacy imports keep working — moved into the new badge module.
export { Title };
