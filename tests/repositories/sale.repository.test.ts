// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { categories, items } from "@/db/schema";
import { SaleRepository } from "@/repositories/sale.repository";
import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../helpers/test-db";

describe("SaleRepository", () => {
  let db: TestDb;
  let repo: SaleRepository;
  let itemId: string;

  beforeEach(async () => {
    db = await createTestDb();
    repo = new SaleRepository(db);
    const [cat] = await db
      .insert(categories)
      .values({ name: "Test Category" })
      .returning();
    const [item] = await db
      .insert(items)
      .values({ categoryId: cat!.id, attributes: {} })
      .returning();
    itemId = item!.id;
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it("creates a sale row with required fields", async () => {
    const sale = await repo.create({
      itemId,
      soldPrice: "30.00",
      platform: "Depop",
    });
    expect(sale.itemId).toBe(itemId);
    expect(sale.soldPrice).toBe("30.00");
    expect(sale.platform).toBe("Depop");
    expect(sale.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("findByItemId returns null when no sale exists", async () => {
    expect(await repo.findByItemId(itemId)).toBeNull();
  });

  it("findByItemId returns the sale when present", async () => {
    const created = await repo.create({ itemId, soldPrice: "25.00" });
    const found = await repo.findByItemId(itemId);
    expect(found?.id).toBe(created.id);
  });

  it("rejects a duplicate sale for the same item (1:0..1)", async () => {
    await repo.create({ itemId, soldPrice: "25.00" });
    await expect(
      repo.create({ itemId, soldPrice: "30.00" }),
    ).rejects.toThrow();
  });

  it("create works inside an outer transaction", async () => {
    await db.transaction(async (tx) => {
      const sale = await repo.create(
        { itemId, soldPrice: "12.34", platform: "eBay" },
        tx,
      );
      const found = await repo.findByItemId(itemId, tx);
      expect(found?.id).toBe(sale.id);
    });
  });
});
