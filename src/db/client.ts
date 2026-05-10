import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

/**
 * A typed Drizzle database handle bound to the project schema.
 */
export type Db = NeonDatabase<typeof schema>;

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
