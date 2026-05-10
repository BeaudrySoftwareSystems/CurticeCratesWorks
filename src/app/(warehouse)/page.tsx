import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function WarehouseHomePage(): Promise<React.ReactElement> {
  const session = await auth();
  const email = session?.user?.email ?? "unknown";

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Curtis Crates
        </h1>
        <p className="text-sm text-slate-500">Signed in as {email}.</p>
      </header>
      <nav className="grid gap-3 sm:grid-cols-2">
        <Link
          href={{ pathname: "/intake" }}
          className="flex min-h-20 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          New intake
        </Link>
        <span className="flex min-h-20 items-center justify-center rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700">
          Catalog · coming in Unit 8
        </span>
      </nav>
    </main>
  );
}
