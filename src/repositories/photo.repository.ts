import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { photos } from "@/db/schema";
import type { NewPhoto, Photo } from "@/domain/photo";

/**
 * Pure persistence for the `photos` table. Every method accepts an optional
 * tx handle so the Service can compose the gateway-then-DB ordering inside
 * a transaction if it ever needs to (today `completeUpload` is a single
 * insert, but the seam is consistent with item / sale repos).
 *
 * Photos are scoped per item; deleting an item cascades photo rows via the
 * FK declared on the schema (no application-level cleanup required).
 */
export class PhotoRepository {
  constructor(private readonly db: Db) {}

  async create(input: NewPhoto, tx?: Db): Promise<Photo> {
    const handle = tx ?? this.db;
    const [row] = await handle.insert(photos).values(input).returning();
    if (row === undefined) {
      throw new Error("photo insert returned no row");
    }
    return row;
  }

  async listForItem(itemId: string, tx?: Db): Promise<Photo[]> {
    const handle = tx ?? this.db;
    return handle
      .select()
      .from(photos)
      .where(eq(photos.itemId, itemId))
      .orderBy(asc(photos.sortOrder), asc(photos.createdAt));
  }

  /**
   * Bulk lookup used by the catalog Server Component to resolve a single
   * cover photo per item without N+1 round-trips. Caller is responsible
   * for grouping by `itemId` (a Map keyed by id is cheap and avoids
   * forcing a particular shape on consumers).
   */
  async listForItems(itemIds: readonly string[], tx?: Db): Promise<Photo[]> {
    if (itemIds.length === 0) {
      return [];
    }
    const handle = tx ?? this.db;
    return handle
      .select()
      .from(photos)
      .where(inArray(photos.itemId, [...itemIds]))
      .orderBy(asc(photos.sortOrder), asc(photos.createdAt));
  }

  async deleteById(id: string, tx?: Db): Promise<void> {
    const handle = tx ?? this.db;
    await handle.delete(photos).where(eq(photos.id, id));
  }
}
