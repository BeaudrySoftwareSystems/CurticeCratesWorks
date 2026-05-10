import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import { LinkButton } from "@/components/ui/button";
import { PageHeader, STANDARD_NAV_LINKS } from "@/components/ui/page-header";
import {
  Display,
  Label,
  Tabular,
} from "@/components/ui/typography";

export const dynamic = "force-dynamic";

/**
 * Categories admin list. Shows every inventory type the system knows
 * about, with item counts and attribute counts so the operator can
 * tell at a glance which categories are well-defined and which need
 * attribute work.
 */
export default async function CategoriesAdminPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  const db = getDb();
  const [categories, allItems, allDefs] = await Promise.all([
    new CategoryRepository(db).list(),
    new ItemRepository(db).listAll(),
    listAllDefinitions(db),
  ]);

  const itemCountByCategory = new Map<string, number>();
  for (const item of allItems) {
    if (item.categoryId !== null) {
      itemCountByCategory.set(
        item.categoryId,
        (itemCountByCategory.get(item.categoryId) ?? 0) + 1,
      );
    }
  }
  const defCountByCategory = new Map<string, number>();
  for (const def of allDefs) {
    defCountByCategory.set(
      def.categoryId,
      (defCountByCategory.get(def.categoryId) ?? 0) + 1,
    );
  }

  return (
    <>
      <PageHeader
        email={session.user.email ?? undefined}
        navLinks={STANDARD_NAV_LINKS}
        cta={
          <LinkButton href="/admin/categories/new" variant="primary">
            Add category
          </LinkButton>
        }
      />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
        <header className="grid gap-3">
          <Label>Admin</Label>
          <Display>Categories</Display>
          <p className="font-sans text-[14px] text-driftwood">
            Inventory types are data, not code. Add a new category any
            time you start carrying a new product line. Attribute fields
            on each category drive the dynamic intake form.
          </p>
        </header>

        {categories.length === 0 ? (
          <div className="grid gap-3 rounded-lg border border-dashed border-edge bg-paper px-6 py-10 text-center">
            <p className="font-sans text-[15px] text-soot">
              No categories yet.
            </p>
            <p className="font-sans text-[13px] text-driftwood">
              Add the first to start tracking inventory.
            </p>
            <div className="pt-2">
              <LinkButton href="/admin/categories/new" variant="primary">
                Add the first category
              </LinkButton>
            </div>
          </div>
        ) : (
          <ul className="grid gap-2">
            {categories.map((cat) => {
              const itemCount = itemCountByCategory.get(cat.id) ?? 0;
              const defCount = defCountByCategory.get(cat.id) ?? 0;
              return (
                <li key={cat.id}>
                  <Link
                    href={
                      `/admin/categories/${cat.id}` as Parameters<
                        typeof Link
                      >[0]["href"]
                    }
                    className="grid gap-1 rounded-lg border border-hairline bg-paper px-4 py-3 transition-colors hover:border-ember focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-sans text-[15px] font-medium text-soot">
                        {cat.name}
                      </span>
                      <span className="font-sans text-[12px] text-driftwood">
                        <Tabular>{defCount}</Tabular>{" "}
                        {defCount === 1 ? "attribute" : "attributes"} ·{" "}
                        <Tabular>{itemCount}</Tabular>{" "}
                        {itemCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                    {cat.description !== null && cat.description !== "" ? (
                      <p className="font-sans text-[13px] text-driftwood">
                        {cat.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

async function listAllDefinitions(
  db: ReturnType<typeof getDb>,
): Promise<Awaited<ReturnType<AttributeDefinitionRepository["listForCategory"]>>> {
  // Tiny convenience around the per-category lookup for the count. The
  // repo doesn't expose listAll because it isn't generally useful — only
  // this admin page needs it. Inline rather than promote the surface.
  const { attributeDefinitions } = await import("@/db/schema");
  return db.select().from(attributeDefinitions);
}
