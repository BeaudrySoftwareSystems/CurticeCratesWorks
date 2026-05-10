import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { items, type Item, type NewItem } from "@/db/schema";
import type { ItemStatus } from "@/domain/item";

/**
 * Pure persistence for the `items` table. No business logic — status
 * transition rules and cross-table orchestration live in the Service layer.
 *
 * Every mutating method accepts an optional `tx` handle so the Service can
 * compose multiple writes inside a single `db.transaction()` block (used by
 * `markSold` and `quickRecordSale`). When no `tx` is supplied, the repo's
 * own `db` is used directly.
 */
export class ItemRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string, tx?: Db): Promise<Item | null> {
    const handle = tx ?? this.db;
    const rows = await handle.select().from(items).where(eq(items.id, id));
    return rows[0] ?? null;
  }

  async findByDisplayId(displayId: number, tx?: Db): Promise<Item | null> {
    const handle = tx ?? this.db;
    const rows = await handle
      .select()
      .from(items)
      .where(eq(items.displayId, displayId));
    return rows[0] ?? null;
  }

  async listStocked(tx?: Db): Promise<Item[]> {
    const handle = tx ?? this.db;
    return handle.select().from(items).where(eq(items.status, "stocked"));
  }

  async listAll(tx?: Db): Promise<Item[]> {
    const handle = tx ?? this.db;
    return handle.select().from(items);
  }

  async create(input: NewItem, tx?: Db): Promise<Item> {
    const handle = tx ?? this.db;
    const [row] = await handle.insert(items).values(input).returning();
    if (row === undefined) {
      throw new Error("item insert returned no row");
    }
    return row;
  }

  async setStatus(
    id: string,
    status: ItemStatus,
    tx?: Db,
  ): Promise<Item | null> {
    const handle = tx ?? this.db;
    const [row] = await handle
      .update(items)
      .set({ status, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    patch: Partial<
      Pick<NewItem, "attributes" | "cost" | "listPrice" | "location">
    >,
    tx?: Db,
  ): Promise<Item | null> {
    const handle = tx ?? this.db;
    const [row] = await handle
      .update(items)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return row ?? null;
  }
}
