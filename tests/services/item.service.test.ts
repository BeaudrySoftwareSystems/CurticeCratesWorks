// @vitest-environment node
import pino from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import {
  categories,
  sales as salesTable,
  type Item,
  type NewItem,
  type NewSale,
  type Sale,
} from "@/db/schema";
import {
  ErrAlreadySold,
  ErrInvalidTransition,
  ErrNotFound,
} from "@/domain/errors";
import type { ItemStatus } from "@/domain/item";
import { ItemRepository } from "@/repositories/item.repository";
import { SaleRepository } from "@/repositories/sale.repository";
import { ItemService } from "@/services/item.service";
import { closeTestDb, createTestDb, type TestDb } from "../helpers/test-db";

// --- Fake repos (in-memory, shared state) -----------------------------------

type Stored = Item;

function makeFakes(): {
  items: {
    create: (input: NewItem) => Promise<Item>;
    findById: (id: string) => Promise<Item | null>;
    setStatus: (id: string, status: ItemStatus) => Promise<Item | null>;
    update: (
      id: string,
      patch: Partial<
        Pick<NewItem, "attributes" | "cost" | "listPrice" | "location">
      >,
    ) => Promise<Item | null>;
  };
  sales: { create: (input: NewSale) => Promise<Sale> };
  store: { items: Map<string, Stored>; sales: Map<string, Sale> };
} {
  const items = new Map<string, Stored>();
  const sales = new Map<string, Sale>();
  let counter = 1;

  const itemsFake = {
    async create(input: NewItem): Promise<Item> {
      const id = `01HFAKEITEM${String(counter).padStart(15, "0")}`;
      const now = new Date();
      const row: Stored = {
        id,
        displayId: counter,
        categoryId: input.categoryId ?? null,
        attributes: input.attributes ?? {},
        location: input.location ?? null,
        cost: input.cost ?? null,
        listPrice: input.listPrice ?? null,
        status: input.status ?? "stocked",
        intakeSkipped: input.intakeSkipped ?? false,
        createdAt: now,
        updatedAt: now,
      };
      counter += 1;
      items.set(id, row);
      return row;
    },
    async findById(id: string): Promise<Item | null> {
      return items.get(id) ?? null;
    },
    async setStatus(id: string, status: ItemStatus): Promise<Item | null> {
      const row = items.get(id);
      if (row === undefined) return null;
      const updated = { ...row, status, updatedAt: new Date() };
      items.set(id, updated);
      return updated;
    },
    async update(
      id: string,
      patch: Partial<
        Pick<NewItem, "attributes" | "cost" | "listPrice" | "location">
      >,
    ): Promise<Item | null> {
      const row = items.get(id);
      if (row === undefined) return null;
      const updated: Stored = {
        ...row,
        ...(patch.attributes !== undefined
          ? { attributes: patch.attributes }
          : {}),
        ...(patch.cost !== undefined ? { cost: patch.cost } : {}),
        ...(patch.listPrice !== undefined ? { listPrice: patch.listPrice } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
        updatedAt: new Date(),
      };
      items.set(id, updated);
      return updated;
    },
  };

  const salesFake = {
    async create(input: NewSale): Promise<Sale> {
      for (const existing of sales.values()) {
        if (existing.itemId === input.itemId) {
          throw new Error("duplicate sale for item (fake unique violation)");
        }
      }
      const id = `01HFAKESALE${String(sales.size + 1).padStart(15, "0")}`;
      const row: Sale = {
        id,
        itemId: input.itemId,
        soldPrice: input.soldPrice,
        soldAt: input.soldAt ?? new Date(),
        platform: input.platform ?? null,
        buyerReference: input.buyerReference ?? null,
        createdAt: new Date(),
      };
      sales.set(id, row);
      return row;
    },
  };

  return { items: itemsFake, sales: salesFake, store: { items, sales } };
}

/**
 * A no-op Db with `transaction(cb)` that just invokes the callback. The
 * fakes ignore the tx handle, so passing the same fake-db is harmless.
 */
function fakeDb(): Db {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: (cb: (tx: any) => Promise<unknown>) => cb({}),
  } as unknown as Db;
}

const silentLogger = pino({ level: "silent" });

describe("ItemService (unit, fake repos)", () => {
  it("createItem: persists a stocked item and emits item.created", async () => {
    const fakes = makeFakes();
    const log = pino({ level: "silent" });
    const infoSpy = vi.spyOn(log, "info");
    const svc = new ItemService(fakeDb(), fakes.items, fakes.sales, log);

    const item = await svc.createItem({
      categoryId: "cat-1",
      attributes: { brand: "Levi's" },
    });

    expect(item.status).toBe("stocked");
    expect(fakes.store.items.size).toBe(1);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: "item.created", itemId: item.id }),
      expect.any(String),
    );
  });

  it("finalizeIntake: applies attributes/cost/listPrice/location to a stocked draft", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(fakeDb(), fakes.items, fakes.sales, silentLogger);
    const draft = await svc.createItem({ categoryId: "cat-1" });

    const finalized = await svc.finalizeIntake(draft.id, {
      attributes: { brand: "Levi's", size: "32" },
      cost: "15.00",
      listPrice: "45.00",
      location: "B3",
    });

    expect(finalized.attributes).toEqual({ brand: "Levi's", size: "32" });
    expect(finalized.cost).toBe("15.00");
    expect(finalized.listPrice).toBe("45.00");
    expect(finalized.location).toBe("B3");
    expect(finalized.status).toBe("stocked");
  });

  it("finalizeIntake: throws ErrNotFound when the draft id is unknown", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(fakeDb(), fakes.items, fakes.sales, silentLogger);
    await expect(
      svc.finalizeIntake("01HZZZZZZZZZZZZZZZZZZZZZZZ", {
        attributes: {},
        cost: "1.00",
      }),
    ).rejects.toBeInstanceOf(ErrNotFound);
  });

  it("finalizeIntake: refuses to finalize an item that has already been sold", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(fakeDb(), fakes.items, fakes.sales, silentLogger);
    const draft = await svc.createItem({ categoryId: "cat-1" });
    await svc.markSold(draft.id, { soldPrice: "30.00" });

    await expect(
      svc.finalizeIntake(draft.id, { attributes: {}, cost: "5.00" }),
    ).rejects.toBeInstanceOf(ErrInvalidTransition);
  });

  it("markSold: stocked → sold, atomically inserts sale row", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    const created = await svc.createItem({ categoryId: "cat-1" });

    const updated = await svc.markSold(created.id, {
      soldPrice: "30.00",
      platform: "Depop",
    });

    expect(updated.status).toBe("sold");
    expect(fakes.store.sales.size).toBe(1);
    const [sale] = [...fakes.store.sales.values()];
    expect(sale?.itemId).toBe(created.id);
  });

  it("markSold: throws ErrAlreadySold when item is already sold", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    const item = await svc.createItem({ categoryId: "cat-1" });
    await svc.markSold(item.id, { soldPrice: "30.00" });

    await expect(
      svc.markSold(item.id, { soldPrice: "31.00" }),
    ).rejects.toBeInstanceOf(ErrAlreadySold);
  });

  it("markSold: throws ErrInvalidTransition when item is archived", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    const item = await svc.createItem({ categoryId: "cat-1" });
    await svc.archive(item.id);

    await expect(
      svc.markSold(item.id, { soldPrice: "30.00" }),
    ).rejects.toBeInstanceOf(ErrInvalidTransition);
  });

  it("markSold: throws ErrNotFound when item does not exist", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    await expect(
      svc.markSold("01HZZZZZZZZZZZZZZZZZZZZZZZ", { soldPrice: "1.00" }),
    ).rejects.toBeInstanceOf(ErrNotFound);
  });

  it("archive: stocked → archived succeeds", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    const item = await svc.createItem({ categoryId: "cat-1" });
    const archived = await svc.archive(item.id);
    expect(archived.status).toBe("archived");
  });

  it("archive: sold → archived succeeds (sale row preserved)", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    const item = await svc.createItem({ categoryId: "cat-1" });
    await svc.markSold(item.id, { soldPrice: "30.00" });

    const archived = await svc.archive(item.id);

    expect(archived.status).toBe("archived");
    expect(fakes.store.sales.size).toBe(1);
  });

  it("archive: archived → archived throws ErrInvalidTransition", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    const item = await svc.createItem({ categoryId: "cat-1" });
    await svc.archive(item.id);
    await expect(svc.archive(item.id)).rejects.toBeInstanceOf(
      ErrInvalidTransition,
    );
  });

  it("archive: throws ErrNotFound when item does not exist", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    await expect(
      svc.archive("01HZZZZZZZZZZZZZZZZZZZZZZZ"),
    ).rejects.toBeInstanceOf(ErrNotFound);
  });

  it("quickRecordSale: creates an intake-skipped sold item plus its sale row", async () => {
    const fakes = makeFakes();
    const svc = new ItemService(
      fakeDb(),
      fakes.items,
      fakes.sales,
      silentLogger,
    );
    const result = await svc.quickRecordSale({
      categoryId: "cat-1",
      soldPrice: "20.00",
      platform: "Poshmark",
    });
    expect(result.item.status).toBe("sold");
    expect(result.item.intakeSkipped).toBe(true);
    expect(result.sale.itemId).toBe(result.item.id);
  });
});

// --- Integration: real PGlite, real repos, tx rollback ----------------------

describe("ItemService (integration, real PGlite)", () => {
  let db: TestDb;
  let svc: ItemService;
  let categoryId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const [cat] = await db
      .insert(categories)
      .values({ name: "Integration Cat" })
      .returning();
    categoryId = cat!.id;
    svc = new ItemService(
      db,
      new ItemRepository(db),
      new SaleRepository(db),
      silentLogger,
    );
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it("markSold leaves item status untouched when the sale insert fails inside the tx", async () => {
    const stocked = await svc.createItem({ categoryId });
    // Pre-insert a sale row out-of-band so the transactional sale insert in
    // markSold fails the `sales_item_id_unique` constraint.
    await db
      .insert(salesTable)
      .values({ itemId: stocked.id, soldPrice: "1.00" });

    await expect(
      svc.markSold(stocked.id, { soldPrice: "30.00" }),
    ).rejects.toThrow();

    const after = await new ItemRepository(db).findById(stocked.id);
    expect(after?.status).toBe("stocked");
  });
});
