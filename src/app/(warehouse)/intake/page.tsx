import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { auth } from "@/lib/auth";
import { CategoryRepository } from "@/repositories/category.repository";

export const dynamic = "force-dynamic";

/**
 * Intake entry point: pick a category. Server Component that hits the DB
 * directly (no Server Action required for a read). The picker links to
 * `/intake/[categoryId]` where a draft item is created at mount time.
 */
export default async function IntakeIndexPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  const categories = await new CategoryRepository(getDb()).list();

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Step 1 of 2
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          New item — pick a category
        </h1>
      </header>
      {categories.length === 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          No categories seeded yet. Run <code>bun run db:seed</code>.
        </p>
      ) : (
        <ul className="grid gap-3">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                // SAFETY: dynamic segment; Next typed-routes can't narrow.
                href={`/intake/${cat.id}` as Parameters<typeof Link>[0]["href"]}
                className="flex min-h-14 items-center justify-between rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>{cat.name}</span>
                <span aria-hidden className="text-slate-400">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
