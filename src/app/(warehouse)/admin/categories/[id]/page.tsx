import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import { AttributeDefinitionForm } from "@/components/admin/AttributeDefinitionForm";
import { AttributesList } from "@/components/admin/AttributesList";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";
import { PageHeader, STANDARD_NAV_LINKS } from "@/components/ui/page-header";
import {
  Display,
  Headline,
  Label,
  Tabular,
} from "@/components/ui/typography";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
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
  const category = await new CategoryRepository(db).findById(id);
  if (category === null) {
    notFound();
  }
  const [definitions, itemCount] = await Promise.all([
    new AttributeDefinitionRepository(db).listForCategory(id),
    new ItemRepository(db).countByCategory(id),
  ]);

  return (
    <>
      <PageHeader
        email={session.user.email ?? undefined}
        navLinks={STANDARD_NAV_LINKS}
      />
      <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8">
        <header className="grid gap-3">
          <Link
            href={{ pathname: "/admin/categories" }}
            className="inline-flex w-fit items-center gap-1.5 font-sans text-[13px] text-driftwood transition-colors hover:text-soot"
          >
            <span aria-hidden>←</span>
            Categories
          </Link>
          <Label>Editing category</Label>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Display>{category.name}</Display>
            <span className="font-sans text-[12px] text-driftwood">
              <Tabular>{definitions.length}</Tabular>{" "}
              {definitions.length === 1 ? "attribute" : "attributes"} ·{" "}
              <Tabular>{itemCount}</Tabular>{" "}
              {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </header>

        <section className="grid gap-3">
          <Headline>Details</Headline>
          <CategoryForm
            mode="update"
            categoryId={category.id}
            defaults={{
              name: category.name,
              description: category.description,
              sortOrder: category.sortOrder,
            }}
          />
        </section>

        <section className="grid gap-3">
          <Headline>Attributes</Headline>
          <p className="font-sans text-[13px] text-driftwood">
            Each attribute becomes a field on the intake form for this
            category. Existing item data is preserved when an attribute
            is removed.
          </p>
          <AttributesList categoryId={category.id} definitions={definitions} />
        </section>

        <section className="grid gap-3 rounded-lg border border-hairline bg-paper p-4">
          <Label>Add attribute</Label>
          <AttributeDefinitionForm
            categoryId={category.id}
            mode="create"
            defaults={{ sortOrder: definitions.length }}
          />
        </section>

        <section className="grid gap-3 border-t border-hairline pt-6">
          <Label>Danger zone</Label>
          <DeleteCategoryButton
            categoryId={category.id}
            itemCount={itemCount}
          />
        </section>
      </main>
    </>
  );
}
