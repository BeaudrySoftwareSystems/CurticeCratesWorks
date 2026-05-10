import { and, desc, eq, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { items, type Item, type NewItem } from "@/db/schema";
import type { ItemStatus } from "@/domain/item";

export interface ListFilter {
  status?: ItemStatus;
  categoryId?: string;
}

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

  /**
   * Filtered list used by the catalog. Filters compose: omitting a field
   * means "any". Sorted newest-first by `createdAt` so just-intaken items
   * land at the top of the catalog. Pagination is deferred to v2 — the
   * single-warehouse dataset is small enough today that it doesn't pay
   * to add LIMIT/OFFSET plumbing yet.
   */
  async list(filter: ListFilter = {}, tx?: Db): Promise<Item[]> {
    const handle = tx ?? this.db;
    const conds: SQL[] = [];
    if (filter.status !== undefined) {
      conds.push(eq(items.status, filter.status));
    }
    if (filter.categoryId !== undefined) {
      conds.push(eq(items.categoryId, filter.categoryId));
    }
    const whereClause = conds.length > 0 ? and(...conds) : undefined;
    const query = handle.select().from(items);
    return whereClause === undefined
      ? query.orderBy(desc(items.createdAt))
      : query.where(whereClause).orderBy(desc(items.createdAt));
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
