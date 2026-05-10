import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { startDraftIntake } from "@/app/actions/intake";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

/**
 * Intake form host. Server Component:
 *   1. requires a session
 *   2. loads the category + its attribute definitions
 *   3. creates a draft `stocked` item via the Server Action so photos
 *      uploaded from the form attach to a real item id
 *   4. renders the (Client) IntakeForm
 *
 * If the user abandons the page, the draft sits as an empty `stocked`
 * item in the catalog — they can archive it from item detail. v1 trade-off
 * documented in the action.
 */
export default async function IntakeCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  const { categoryId } = await params;
  const db = getDb();
  const category = await new CategoryRepository(db).findById(categoryId);
  if (category === null) {
    notFound();
  }
  const definitions = await new AttributeDefinitionRepository(db).listForCategory(
    categoryId,
  );

  // Create the draft. Server Actions can be invoked from RSC bodies.
  const { itemId } = await startDraftIntake(categoryId);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <IntakeForm
          itemId={itemId}
          categoryId={categoryId}
          categoryName={category.name}
          definitions={definitions}
        />
      </main>
    </>
  );
}
