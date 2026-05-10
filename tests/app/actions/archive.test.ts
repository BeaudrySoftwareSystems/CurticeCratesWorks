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
import {
  archiveItemAction,
  type ArchiveFormState,
} from "@/app/actions/archive";

const idle: ArchiveFormState = { status: "idle" };

let testDb: TestDb;
let stockedId: string;

beforeEach(async () => {
  testDb = await createTestDb();
  mocks.dbHandle.current = testDb;
  mocks.authMock.mockResolvedValue({ user: { email: "staff@example.com" } });
  mocks.redirectMock.mockClear();
  mocks.revalidatePathMock.mockClear();

  const cat = await new CategoryRepository(testDb).create({
    name: "Clothing",
  });
  const item = await new ItemRepository(testDb).create({
    categoryId: cat.id,
    attributes: {},
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

describe("archiveItemAction", () => {
  it("returns sign-in error when there is no session", async () => {
    mocks.authMock.mockResolvedValueOnce(null);
    const result = await archiveItemAction(idle, fd({ itemId: stockedId }));
    expect(result.message).toMatch(/sign in/i);
  });

  it("flips a stocked item to archived on the happy path", async () => {
    let thrown: string | null = null;
    try {
      await archiveItemAction(idle, fd({ itemId: stockedId }));
    } catch (err) {
      thrown = (err as Error).message;
    }
    expect(thrown).toMatch(/^__redirect__:\/items\//);
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/(warehouse)");

    const item = await new ItemRepository(testDb).findById(stockedId);
    expect(item?.status).toBe("archived");
  });

  it("allows archiving a sold item (sale row preserved by repo)", async () => {
    const repo = new ItemRepository(testDb);
    await repo.setStatus(stockedId, "sold");
    let thrown: string | null = null;
    try {
      await archiveItemAction(idle, fd({ itemId: stockedId }));
    } catch (err) {
      thrown = (err as Error).message;
    }
    expect(thrown).toMatch(/^__redirect__:\/items\//);
    const item = await repo.findById(stockedId);
    expect(item?.status).toBe("archived");
  });

  it("returns an already-archived message when called twice", async () => {
    try {
      await archiveItemAction(idle, fd({ itemId: stockedId }));
    } catch {
      /* redirect */
    }
    const second = await archiveItemAction(
      idle,
      fd({ itemId: stockedId }),
    );
    expect(second.message).toMatch(/already archived/i);
  });

  it("returns ErrNotFound message when the item id is unknown", async () => {
    const result = await archiveItemAction(
      idle,
      fd({ itemId: "01HZZZZZZZZZZZZZZZZZZZZZZZ" }),
    );
    expect(result.message).toMatch(/not found/i);
  });
});
