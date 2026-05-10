import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";
import { SaleRepository } from "@/repositories/sale.repository";
import { ItemDetail } from "@/components/item/ItemDetail";
import { PageHeader, STANDARD_NAV_LINKS } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

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
  const [photos, category, sale] = await Promise.all([
    new PhotoRepository(db).listForItem(id),
    item.categoryId !== null
      ? new CategoryRepository(db).findById(item.categoryId)
      : Promise.resolve(null),
    new SaleRepository(db).findByItemId(id),
  ]);

  return (
    <>
      <PageHeader
        email={session.user.email ?? undefined}
        navLinks={STANDARD_NAV_LINKS}
      />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ItemDetail
          item={item}
          category={category}
          photos={photos}
          sale={sale}
          blobBaseUrl={process.env["BLOB_STORE_BASE_URL"]}
        />
      </main>
    </>
  );
}
