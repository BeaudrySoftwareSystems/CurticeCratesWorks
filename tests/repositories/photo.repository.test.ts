// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";
import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../helpers/test-db";

describe("PhotoRepository", () => {
  let db: TestDb;
  let repo: PhotoRepository;
  let itemId: string;

  beforeEach(async () => {
    db = await createTestDb();
    repo = new PhotoRepository(db);
    const cat = await new CategoryRepository(db).create({ name: "Clothing" });
    const item = await new ItemRepository(db).create({
      categoryId: cat.id,
      attributes: {},
    });
    itemId = item.id;
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it("creates a photo and lists it back", async () => {
    const created = await repo.create({
      itemId,
      blobPath: "items/abc/photo-xyz.webp",
    });
    expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(created.blobPath).toBe("items/abc/photo-xyz.webp");
    expect(created.sortOrder).toBe(0);

    const rows = await repo.listForItem(itemId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.blobPath).toBe("items/abc/photo-xyz.webp");
  });

  it("listForItem returns rows ordered by sortOrder ASC then createdAt ASC", async () => {
    await repo.create({
      itemId,
      blobPath: "items/a/late.webp",
      sortOrder: 2,
    });
    await repo.create({
      itemId,
      blobPath: "items/a/first.webp",
      sortOrder: 0,
    });
    await repo.create({
      itemId,
      blobPath: "items/a/middle.webp",
      sortOrder: 1,
    });

    const rows = await repo.listForItem(itemId);
    expect(rows.map((r) => r.blobPath)).toEqual([
      "items/a/first.webp",
      "items/a/middle.webp",
      "items/a/late.webp",
    ]);
  });

  it("listForItem returns an empty array when the item has no photos", async () => {
    expect(await repo.listForItem(itemId)).toEqual([]);
  });

  it("listForItem only returns photos for the requested item", async () => {
    const cat = await new CategoryRepository(db).create({ name: "Shoes" });
    const otherItem = await new ItemRepository(db).create({
      categoryId: cat.id,
      attributes: {},
    });

    await repo.create({ itemId, blobPath: "items/mine.webp" });
    await repo.create({
      itemId: otherItem.id,
      blobPath: "items/theirs.webp",
    });

    const rows = await repo.listForItem(itemId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.blobPath).toBe("items/mine.webp");
  });

  it("deleteById removes the row", async () => {
    const created = await repo.create({
      itemId,
      blobPath: "items/a/gone.webp",
    });
    await repo.deleteById(created.id);
    expect(await repo.listForItem(itemId)).toEqual([]);
  });

  it("cascades photo deletion when the parent item is deleted", async () => {
    await repo.create({ itemId, blobPath: "items/a/orphan.webp" });
    await db.execute(`DELETE FROM items WHERE id = '${itemId}'`);
    expect(await repo.listForItem(itemId)).toEqual([]);
  });

  it("listForItems batches across multiple item ids in one query", async () => {
    const cat = await new CategoryRepository(db).create({ name: "ShoesB" });
    const itemB = await new ItemRepository(db).create({
      categoryId: cat.id,
      attributes: {},
    });
    await repo.create({ itemId, blobPath: "items/a/cover.webp" });
    await repo.create({ itemId, blobPath: "items/a/second.webp" });
    await repo.create({ itemId: itemB.id, blobPath: "items/b/cover.webp" });

    const rows = await repo.listForItems([itemId, itemB.id]);
    expect(rows.map((r) => r.blobPath).sort()).toEqual([
      "items/a/cover.webp",
      "items/a/second.webp",
      "items/b/cover.webp",
    ]);
  });

  it("listForItems returns an empty array on an empty input list", async () => {
    expect(await repo.listForItems([])).toEqual([]);
  });

  it("create works inside an outer transaction", async () => {
    await db.transaction(async (tx) => {
      await repo.create(
        { itemId, blobPath: "items/a/tx.webp" },
        tx as unknown as TestDb,
      );
    });
    expect(
      (await repo.listForItem(itemId)).map((r) => r.blobPath),
    ).toEqual(["items/a/tx.webp"]);
  });
});
