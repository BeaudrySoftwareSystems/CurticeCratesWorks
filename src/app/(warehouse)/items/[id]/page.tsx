import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { ItemRepository } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";
import { CategoryRepository } from "@/repositories/category.repository";

export const dynamic = "force-dynamic";

/**
 * Minimal item detail. Renders status, attributes, photos, location, cost,
 * and list price. Mark-sold / Archive / Reprint Label CTAs land in Unit 8
 * (catalog + actions) — this page exists today as the post-intake landing
 * spot so the redirect after `finalizeIntakeAction` goes somewhere useful.
 */
export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const db = getDb();
  const item = await new ItemRepository(db).findById(id);
  if (item === null) {
    notFound();
  }
  const [photos, category] = await Promise.all([
    new PhotoRepository(db).listForItem(id),
    item.categoryId !== null
      ? new CategoryRepository(db).findById(item.categoryId)
      : Promise.resolve(null),
  ]);

  const blobBase = process.env["BLOB_STORE_BASE_URL"];

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {category?.name ?? "Item"} · #{String(item.displayId).padStart(6, "0")}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {category?.name ?? "Item"} {String(item.displayId).padStart(6, "0")}
          </h1>
          <StatusBadge status={item.status} />
        </div>
      </header>

      {photos.length > 0 && blobBase !== undefined ? (
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
                  src={`${blobBase.replace(/\/+$/, "")}/${p.blobPath.replace(/^\/+/, "")}`}
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
      </section>
    </main>
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
      <p className="text-sm text-slate-500">No attributes set.</p>
    );
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
