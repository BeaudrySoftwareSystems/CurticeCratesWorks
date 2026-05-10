// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`__redirect__:${url}`);
  }),
  revalidatePathMock: vi.fn(),
  dbHandle: { current: null as unknown },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.authMock }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePathMock }));
vi.mock("@/db/client", () => ({
  getDb: () => mocks.dbHandle.current,
}));

import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../../helpers/test-db";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import { SaleRepository } from "@/repositories/sale.repository";
import {
  markSoldAction,
  quickRecordSaleAction,
  type MarkSoldFormState,
  type QuickRecordSaleFormState,
} from "@/app/actions/sale";

const idle: MarkSoldFormState = { status: "idle" };
const idleQuick: QuickRecordSaleFormState = { status: "idle" };

let testDb: TestDb;
let stockedId: string;
let categoryId: string;

beforeEach(async () => {
  testDb = await createTestDb();
  mocks.dbHandle.current = testDb;
  mocks.authMock.mockResolvedValue({ user: { email: "staff@example.com" } });
  mocks.redirectMock.mockClear();
  mocks.revalidatePathMock.mockClear();

  const cat = await new CategoryRepository(testDb).create({
    name: "Clothing",
  });
  categoryId = cat.id;
  const item = await new ItemRepository(testDb).create({
    categoryId: cat.id,
    attributes: {},
    cost: "10.00",
  });
  stockedId = item.id;
});

afterEach(async () => {
  await closeTestDb(testDb);
});

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    f.append(k, v);
  }
  return f;
}

describe("markSoldAction", () => {
  it("returns an unauth message when there is no session", async () => {
    mocks.authMock.mockResolvedValueOnce(null);
    const result = await markSoldAction(idle, fd({ itemId: stockedId, soldPrice: "30" }));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/sign in/i);
  });

  it("returns a fieldError when soldPrice is missing", async () => {
    const result = await markSoldAction(idle, fd({ itemId: stockedId }));
    expect(result.fieldErrors?.["soldPrice"]).toMatch(/required/i);
  });

  it("returns a fieldError when soldPrice is malformed", async () => {
    const result = await markSoldAction(
      idle,
      fd({ itemId: stockedId, soldPrice: "abc" }),
    );
    expect(result.fieldErrors?.["soldPrice"]).toMatch(/number/i);
  });

  it("returns a fieldError when platform is not in the enum", async () => {
    const result = await markSoldAction(
      idle,
      fd({ itemId: stockedId, soldPrice: "30.00", platform: "Etsy" }),
    );
    expect(result.fieldErrors?.["platform"]).toMatch(/Depop/);
  });

  it("flips status to sold and writes a sale row on the happy path", async () => {
    let thrown: string | null = null;
    try {
      await markSoldAction(
        idle,
        fd({
          itemId: stockedId,
          soldPrice: "30.00",
          platform: "Depop",
          buyerReference: "user@example.com",
        }),
      );
    } catch (err) {
      thrown = (err as Error).message;
    }
    expect(thrown).toMatch(/^__redirect__:\/items\//);
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/(warehouse)");

    const item = await new ItemRepository(testDb).findById(stockedId);
    expect(item?.status).toBe("sold");
    const sale = await new SaleRepository(testDb).findByItemId(stockedId);
    expect(sale?.soldPrice).toBe("30.00");
    expect(sale?.platform).toBe("Depop");
    expect(sale?.buyerReference).toBe("user@example.com");
  });

  it("persists platform=NULL when the dropdown is left unselected", async () => {
    try {
      await markSoldAction(
        idle,
        fd({ itemId: stockedId, soldPrice: "30.00" }),
      );
    } catch {
      /* redirect signal */
    }
    const sale = await new SaleRepository(testDb).findByItemId(stockedId);
    expect(sale?.platform).toBeNull();
  });

  it("returns ErrAlreadySold when called twice on the same item", async () => {
    try {
      await markSoldAction(
        idle,
        fd({ itemId: stockedId, soldPrice: "30.00" }),
      );
    } catch {
      /* redirect */
    }
    const second = await markSoldAction(
      idle,
      fd({ itemId: stockedId, soldPrice: "40.00" }),
    );
    expect(second.message).toMatch(/already/i);
  });

  it("rejects an invalid soldAt date", async () => {
    const result = await markSoldAction(
      idle,
      fd({
        itemId: stockedId,
        soldPrice: "30.00",
        soldAt: "not-a-date",
      }),
    );
    expect(result.fieldErrors?.["soldAt"]).toMatch(/valid date/i);
  });
});

describe("quickRecordSaleAction", () => {
  it("returns sign-in error when there is no session", async () => {
    mocks.authMock.mockResolvedValueOnce(null);
    const result = await quickRecordSaleAction(
      idleQuick,
      fd({ soldPrice: "5.00" }),
    );
    expect(result.message).toMatch(/sign in/i);
  });

  it("returns a fieldError when soldPrice is missing", async () => {
    const result = await quickRecordSaleAction(idleQuick, fd({}));
    expect(result.fieldErrors?.["soldPrice"]).toMatch(/required/i);
  });

  it("happy path: creates an intake-skipped sold item with a sale row, no category", async () => {
    let thrown: string | null = null;
    try {
      await quickRecordSaleAction(
        idleQuick,
        fd({
          soldPrice: "12.50",
          platform: "Depop",
          title: "vintage tee",
        }),
      );
    } catch (err) {
      thrown = (err as Error).message;
    }
    expect(thrown).toMatch(/^__redirect__:\/items\//);
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/(warehouse)");

    const items = await new ItemRepository(testDb).list({ status: "sold" });
    const quick = items.find(
      (i) => i.intakeSkipped && i.id !== stockedId,
    );
    expect(quick).toBeDefined();
    expect(quick?.categoryId).toBeNull();
    expect(quick?.attributes).toEqual({ title: "vintage tee" });
  });

  it("happy path: associates the sale with a category when supplied", async () => {
    try {
      await quickRecordSaleAction(
        idleQuick,
        fd({
          soldPrice: "20.00",
          categoryId,
          title: "tag along",
        }),
      );
    } catch {
      /* redirect */
    }
    const items = await new ItemRepository(testDb).list({ status: "sold" });
    const quick = items.find(
      (i) => i.intakeSkipped && i.id !== stockedId,
    );
    expect(quick?.categoryId).toBe(categoryId);
  });

  it("persists platform=NULL when the dropdown is left unselected", async () => {
    try {
      await quickRecordSaleAction(idleQuick, fd({ soldPrice: "5.00" }));
    } catch {
      /* redirect */
    }
    const items = await new ItemRepository(testDb).list({ status: "sold" });
    const quick = items.find((i) => i.intakeSkipped);
    expect(quick).toBeDefined();
    if (quick !== undefined) {
      const sale = await new SaleRepository(testDb).findByItemId(quick.id);
      expect(sale?.platform).toBeNull();
    }
  });
});
