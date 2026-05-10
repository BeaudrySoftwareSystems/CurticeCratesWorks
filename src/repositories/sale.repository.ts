import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sales, type NewSale, type Sale } from "@/db/schema";

/**
 * Pure persistence for the `sales` table. Business rules (e.g. only one
 * sale per item, status must be `sold` when a sale exists) are enforced
 * upstream by the Service layer; the unique constraint on `item_id` is the
 * DB-level safety net.
 */
export class SaleRepository {
  constructor(private readonly db: Db) {}

  async findByItemId(itemId: string, tx?: Db): Promise<Sale | null> {
    const handle = tx ?? this.db;
    const rows = await handle
      .select()
      .from(sales)
      .where(eq(sales.itemId, itemId));
    return rows[0] ?? null;
  }

  async create(input: NewSale, tx?: Db): Promise<Sale> {
    const handle = tx ?? this.db;
    const [row] = await handle.insert(sales).values(input).returning();
    if (row === undefined) {
      throw new Error("sale insert returned no row");
    }
    return row;
  }
}
