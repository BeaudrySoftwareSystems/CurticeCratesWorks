import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle", "migrations");

/**
 * In-memory test database backed by PGlite (WASM Postgres).
 *
 * Each `createTestDb()` call boots a fresh PGlite instance, applies every
 * migration in `drizzle/migrations/*.sql` in lexical order, and returns a
 * Drizzle handle bound to the project schema. Tests are fully hermetic —
 * no Docker, no shared state across test files.
 *
 * Caller is responsible for `close()` in afterAll/afterEach.
 */
export type TestDb = PgliteDatabase<typeof schema> & { $client: PGlite };

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  await client.waitReady;

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    await client.exec(sql);
  }

  return drizzle(client, { schema }) as TestDb;
}

export async function closeTestDb(db: TestDb): Promise<void> {
  await db.$client.close();
}
