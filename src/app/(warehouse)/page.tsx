import { auth } from "@/lib/auth";

export default async function WarehouseHomePage(): Promise<React.ReactElement> {
  const session = await auth();
  const email = session?.user?.email ?? "unknown";

  return (
    <main>
      <h1>Curtis Crates</h1>
      <p>Signed in as {email}.</p>
      <p>
        Catalog, intake, scan, and quick-sale UIs land in Phase 3. For now,
        this is a placeholder protected page that confirms auth + middleware
        are wired correctly.
      </p>
    </main>
  );
}
