import { Pool } from "@neondatabase/serverless";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";

/**
 * A typed Drizzle database handle bound to the project schema.
 *
 * In production this is a `NeonDatabase` (websocket Pool). In tests it is a
 * `PgliteDatabase` (in-memory WASM Postgres). Repository signatures use the
 * structurally-shared `PgDatabase` parent so both flavors are accepted.
 */
export type Db = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/** The prod-only Neon-backed handle, used at the composition root. */
export type ProdDb = NeonDatabase<typeof schema>;

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
  cachedDb = drizzle(pool, { schema });
  return cachedDb;
}

export { schema };
