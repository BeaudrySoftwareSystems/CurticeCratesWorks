import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";
import { PageHeader } from "@/components/ui/page-header";
import { Display, Label } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

/**
 * Intake entry point: pick a category. Server Component that hits the
 * DB directly (no Server Action required for a read). The picker links
 * to `/intake/[categoryId]` where a draft item is created at mount.
 */
export default async function IntakeIndexPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  const categories = await new CategoryRepository(getDb()).list();

  return (
    <>
      <PageHeader email={session.user.email ?? undefined} />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
        <header className="grid gap-3">
          <Label>New item</Label>
          <Display>Pick a category</Display>
        </header>
        {categories.length === 0 ? (
          <p className="rounded-md border border-lantern/40 bg-lantern/10 px-3 py-2 font-sans text-[14px] text-[oklch(40%_0.10_75)]">
            No categories seeded yet. Run <code className="tabular text-soot">bun run db:seed</code>.
          </p>
        ) : (
          <ul className="grid gap-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  // SAFETY: dynamic segment; Next typed-routes can't narrow.
                  href={`/intake/${cat.id}` as Parameters<typeof Link>[0]["href"]}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-hairline bg-paper px-4 py-3 font-sans text-[15px] font-medium text-soot transition-colors hover:border-ember hover:bg-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                >
                  <span>{cat.name}</span>
                  <span aria-hidden className="text-driftwood">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
