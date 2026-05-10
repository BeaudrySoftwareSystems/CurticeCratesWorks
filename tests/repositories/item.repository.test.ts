// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { categories } from "@/db/schema";
import { ItemRepository } from "@/repositories/item.repository";
import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../helpers/test-db";

describe("ItemRepository", () => {
  let db: TestDb;
  let repo: ItemRepository;
  let categoryId: string;

  beforeEach(async () => {
    db = await createTestDb();
    repo = new ItemRepository(db);
    const [cat] = await db
      .insert(categories)
      .values({ name: "Test Category" })
      .returning();
    categoryId = cat!.id;
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  describe("create", () => {
    it("creates a stocked item with an auto-incremented displayId", async () => {
      const a = await repo.create({ categoryId, attributes: {} });
      const b = await repo.create({ categoryId, attributes: {} });

      expect(a.status).toBe("stocked");
      expect(a.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
      expect(typeof a.displayId).toBe("number");
      expect(b.displayId).toBe(a.displayId + 1);
    });

    it("persists optional cost and listPrice as numeric strings", async () => {
      const item = await repo.create({
        categoryId,
        attributes: { brand: "Levi's" },
        cost: "12.50",
        listPrice: "45.00",
        location: "A1",
      });
      expect(item.cost).toBe("12.50");
      expect(item.listPrice).toBe("45.00");
      expect(item.location).toBe("A1");
      expect(item.attributes).toEqual({ brand: "Levi's" });
    });
  });

  describe("findById / findByDisplayId", () => {
    it("returns null when the item does not exist", async () => {
      expect(await repo.findById("01HZZZZZZZZZZZZZZZZZZZZZZZ")).toBeNull();
      expect(await repo.findByDisplayId(99999)).toBeNull();
    });

    it("round-trips items by both id forms", async () => {
      const created = await repo.create({ categoryId, attributes: {} });
      const byId = await repo.findById(created.id);
      const byDisplay = await repo.findByDisplayId(created.displayId);
      expect(byId?.id).toBe(created.id);
      expect(byDisplay?.id).toBe(created.id);
    });
  });

  describe("listStocked / listAll", () => {
    it("listStocked returns only stocked items", async () => {
      const a = await repo.create({ categoryId, attributes: {} });
      const b = await repo.create({ categoryId, attributes: {} });
      await repo.setStatus(b.id, "archived");

      const stocked = await repo.listStocked();
      expect(stocked.map((i) => i.id)).toEqual([a.id]);
    });

    it("listAll returns every item regardless of status", async () => {
      const a = await repo.create({ categoryId, attributes: {} });
      const b = await repo.create({ categoryId, attributes: {} });
      await repo.setStatus(b.id, "sold");

      const all = await repo.listAll();
      expect(all.map((i) => i.id).sort()).toEqual([a.id, b.id].sort());
    });
  });

  describe("setStatus", () => {
    it("updates the status column", async () => {
      const item = await repo.create({ categoryId, attributes: {} });
      await repo.setStatus(item.id, "sold");
      const after = await repo.findById(item.id);
      expect(after?.status).toBe("sold");
    });

    it("returns null when the target item does not exist", async () => {
      const result = await repo.setStatus(
        "01HZZZZZZZZZZZZZZZZZZZZZZZ",
        "sold",
      );
      expect(result).toBeNull();
    });
  });

  describe("list (filtered)", () => {
    it("returns all items newest-first when no filters are passed", async () => {
      const a = await repo.create({ categoryId, attributes: {} });
      await new Promise((r) => setTimeout(r, 5));
      const b = await repo.create({ categoryId, attributes: {} });
      const rows = await repo.list();
      expect(rows.map((r) => r.id)).toEqual([b.id, a.id]);
    });

    it("filters by status", async () => {
      const a = await repo.create({ categoryId, attributes: {} });
      const b = await repo.create({ categoryId, attributes: {} });
      await repo.setStatus(b.id, "sold");
      const stocked = await repo.list({ status: "stocked" });
      expect(stocked.map((r) => r.id)).toEqual([a.id]);
      const sold = await repo.list({ status: "sold" });
      expect(sold.map((r) => r.id)).toEqual([b.id]);
    });

    it("filters by category", async () => {
      const [other] = await db
        .insert(categories)
        .values({ name: "Other Cat" })
        .returning();
      const a = await repo.create({ categoryId, attributes: {} });
      const b = await repo.create({
        categoryId: other!.id,
        attributes: {},
      });
      const inFirst = await repo.list({ categoryId });
      expect(inFirst.map((r) => r.id)).toEqual([a.id]);
      const inOther = await repo.list({ categoryId: other!.id });
      expect(inOther.map((r) => r.id)).toEqual([b.id]);
    });

    it("composes status + category filters with AND semantics", async () => {
      const [other] = await db
        .insert(categories)
        .values({ name: "Another Cat" })
        .returning();
      const a = await repo.create({ categoryId, attributes: {} });
      const b = await repo.create({ categoryId, attributes: {} });
      await repo.setStatus(b.id, "archived");
      await repo.create({ categoryId: other!.id, attributes: {} });

      const result = await repo.list({
        status: "stocked",
        categoryId,
      });
      expect(result.map((r) => r.id)).toEqual([a.id]);
    });
  });

  describe("update", () => {
    it("applies attributes / cost / listPrice / location and bumps updatedAt", async () => {
      const item = await repo.create({ categoryId, attributes: {} });
      const before = item.updatedAt.getTime();

      await new Promise((r) => setTimeout(r, 5));
      const updated = await repo.update(item.id, {
        attributes: { brand: "Nike", size: "M" },
        cost: "20.00",
        listPrice: "60.00",
        location: "A1",
      });

      expect(updated).not.toBeNull();
      expect(updated?.attributes).toEqual({ brand: "Nike", size: "M" });
      expect(updated?.cost).toBe("20.00");
      expect(updated?.listPrice).toBe("60.00");
      expect(updated?.location).toBe("A1");
      expect((updated as { updatedAt: Date }).updatedAt.getTime()).toBeGreaterThan(
        before,
      );
    });

    it("returns null when the target item does not exist", async () => {
      expect(
        await repo.update("01HZZZZZZZZZZZZZZZZZZZZZZZ", { cost: "1.00" }),
      ).toBeNull();
    });
  });

  describe("transactional context", () => {
    it("create / setStatus work inside an outer transaction", async () => {
      await db.transaction(async (tx) => {
        const item = await repo.create(
          { categoryId, attributes: {} },
          tx,
        );
        await repo.setStatus(item.id, "sold", tx);
        const after = await repo.findById(item.id, tx);
        expect(after?.status).toBe("sold");
      });
    });

    it("outer rollback unwinds repo writes", async () => {
      let createdId = "";
      try {
        await db.transaction(async (tx) => {
          const item = await repo.create({ categoryId, attributes: {} }, tx);
          createdId = item.id;
          throw new Error("rollback");
        });
      } catch {
        /* expected */
      }
      expect(await repo.findById(createdId)).toBeNull();
    });
  });
});
