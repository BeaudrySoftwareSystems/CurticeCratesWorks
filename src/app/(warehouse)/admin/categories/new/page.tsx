import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader, STANDARD_NAV_LINKS } from "@/components/ui/page-header";
import { Display, Label } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  return (
    <>
      <PageHeader
        email={session.user.email ?? undefined}
        navLinks={STANDARD_NAV_LINKS}
      />
      <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
        <header className="grid gap-3">
          <Link
            href={{ pathname: "/admin/categories" }}
            className="inline-flex w-fit items-center gap-1.5 font-sans text-[13px] text-driftwood transition-colors hover:text-soot"
          >
            <span aria-hidden>←</span>
            Categories
          </Link>
          <Label>New category</Label>
          <Display>Add an inventory type</Display>
          <p className="font-sans text-[14px] text-driftwood">
            Name and describe it now. You&apos;ll add the per-category
            attribute fields on the next screen.
          </p>
        </header>
        <CategoryForm mode="create" />
      </main>
    </>
  );
}
