import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

/**
 * A typed Drizzle database handle. The schema generic is filled in once
 * `src/db/schema.ts` exists (Unit 3) — until then this is a bare client.
 */
export type Db = NeonDatabase<Record<string, never>>;

let cachedDb: Db | null = null;

/**
 * Returns a singleton Drizzle client backed by a Neon serverless websocket
 * Pool. Required for `db.transaction()` support — the cheaper `neon-http`
 * driver does not support interactive transactions, which Units 4 / 6 / 9
 * all rely on.
 *
 * Fails loudly if `DATABASE_URL` is not set rather than silently returning
 * a misconfigured client.
 */
export function getDb(): Db {
  if (cachedDb !== null) {
    return cachedDb;
  }

  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined || connectionString === "") {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and set the connection string from your Neon project.",
    );
  }

  const pool = new Pool({ connectionString });
  cachedDb = drizzle(pool);
  return cachedDb;
}
