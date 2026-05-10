// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server Action tests use the same fakes-pattern as the service tests:
 * mock auth + db so the action wires deterministically through real
 * services (CategoryService + ItemService) backed by PGlite. The action's
 * error-mapping (ErrValidation → fieldErrors, etc.) is the slice we
 * exercise — the underlying service logic is covered by its own tests.
 *
 * Mock refs go through `vi.hoisted` so they are available when vitest
 * hoists the `vi.mock` calls to the top of the file.
 */

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    // Mimic Next's redirect: throw an internal signal so the action stops.
    throw new Error(`__redirect__:${url}`);
  }),
  revalidatePathMock: vi.fn(),
  dbHandle: { current: null as unknown },
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.authMock,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePathMock,
}));

vi.mock("@/db/client", () => ({
  getDb: () => mocks.dbHandle.current,
}));

import {
  createTestDb,
  closeTestDb,
  type TestDb,
} from "../../helpers/test-db";
import { CategoryRepository } from "@/repositories/category.repository";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { ItemRepository } from "@/repositories/item.repository";

import {
  finalizeIntakeAction,
  startDraftIntake,
  type FinalizeIntakeFormState,
} from "@/app/actions/intake";

const idle: FinalizeIntakeFormState = { status: "idle" };

let testDbHandle: TestDb;
let categoryId: string;
let secondCategoryId: string;

beforeEach(async () => {
  testDbHandle = await createTestDb();
  mocks.dbHandle.current = testDbHandle;
  mocks.authMock.mockResolvedValue({ user: { email: "staff@example.com" } });
  mocks.redirectMock.mockClear();
  mocks.revalidatePathMock.mockClear();

  const catRepo = new CategoryRepository(testDbHandle);
  const defRepo = new AttributeDefinitionRepository(testDbHandle);
  const cat = await catRepo.create({ name: "Clothing" });
  categoryId = cat.id;
  await defRepo.create({
    categoryId,
    key: "brand",
    type: "text",
    required: true,
  });
  await defRepo.create({
    categoryId,
    key: "size",
    type: "text",
    required: true,
  });
  await defRepo.create({
    categoryId,
    key: "pit_to_pit",
    type: "number",
    required: false,
  });

  const cat2 = await catRepo.create({ name: "Misc" });
  secondCategoryId = cat2.id;
});

afterEach(async () => {
  await closeTestDb(testDbHandle);
});

describe("startDraftIntake", () => {
  it("throws when there is no session", async () => {
    mocks.authMock.mockResolvedValueOnce(null);
    await expect(startDraftIntake(categoryId)).rejects.toMatchObject({
      name: "ErrUnauthenticated",
    });
  });

  it("creates a draft stocked item with empty attributes", async () => {
    const { itemId } = await startDraftIntake(categoryId);
    const items = await new ItemRepository(testDbHandle).listAll();
    const created = items.find((i) => i.id === itemId);
    expect(created?.status).toBe("stocked");
    expect(created?.attributes).toEqual({});
    expect(created?.cost).toBeNull();
  });
});

describe("finalizeIntakeAction", () => {
  function fd(entries: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) {
      f.append(k, v);
    }
    return f;
  }

  it("returns a field error when cost is missing", async () => {
    const { itemId } = await startDraftIntake(categoryId);
    const result = await finalizeIntakeAction(
      idle,
      fd({ itemId, categoryId, cost: "" }),
    );
    expect(result.status).toBe("error");
    expect(result.fieldErrors?.["cost"]).toMatch(/required/i);
  });

  it("returns a field error when cost is not a valid number", async () => {
    const { itemId } = await startDraftIntake(categoryId);
    const result = await finalizeIntakeAction(
      idle,
      fd({ itemId, categoryId, cost: "abc" }),
    );
    expect(result.status).toBe("error");
    expect(result.fieldErrors?.["cost"]).toMatch(/number/i);
  });

  it("returns a field error when listPrice is malformed", async () => {
    const { itemId } = await startDraftIntake(categoryId);
    const result = await finalizeIntakeAction(
      idle,
      fd({
        itemId,
        categoryId,
        cost: "10.00",
        listPrice: "10.001",
      }),
    );
    expect(result.fieldErrors?.["listPrice"]).toMatch(/number/i);
  });

  it("returns attribute fieldErrors when a required attr is missing", async () => {
    const { itemId } = await startDraftIntake(categoryId);
    const result = await finalizeIntakeAction(
      idle,
      fd({
        itemId,
        categoryId,
        cost: "10.00",
        "attr.brand": "Nike",
        // size is required and missing
      }),
    );
    expect(result.status).toBe("error");
    expect(Object.keys(result.fieldErrors ?? {})).toContain("attr.size");
  });

  it("coerces FormData strings into numbers for number-typed attributes", async () => {
    const { itemId } = await startDraftIntake(categoryId);
    let thrownRedirect: string | null = null;
    try {
      await finalizeIntakeAction(
        idle,
        fd({
          itemId,
          categoryId,
          cost: "10.00",
          "attr.brand": "Nike",
          "attr.size": "M",
          "attr.pit_to_pit": "22", // string, must coerce to number
        }),
      );
    } catch (err) {
      thrownRedirect = (err as Error).message;
    }
    expect(thrownRedirect).toMatch(/^__redirect__:\/items\//);
    const items = await new ItemRepository(testDbHandle).listAll();
    const finalized = items.find((i) => i.id === itemId);
    expect(finalized?.attributes).toEqual({
      brand: "Nike",
      size: "M",
      pit_to_pit: 22,
    });
    expect(finalized?.cost).toBe("10.00");
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/(warehouse)");
  });

  it("succeeds with no attributes when the category has none", async () => {
    const { itemId } = await startDraftIntake(secondCategoryId);
    let thrownRedirect: string | null = null;
    try {
      await finalizeIntakeAction(
        idle,
        fd({
          itemId,
          categoryId: secondCategoryId,
          cost: "5.00",
          location: "C7",
        }),
      );
    } catch (err) {
      thrownRedirect = (err as Error).message;
    }
    expect(thrownRedirect).toMatch(/^__redirect__:\/items\//);
    const items = await new ItemRepository(testDbHandle).listAll();
    const finalized = items.find((i) => i.id === itemId);
    expect(finalized?.attributes).toEqual({});
    expect(finalized?.location).toBe("C7");
  });

  it("rejects oversized location strings", async () => {
    const { itemId } = await startDraftIntake(categoryId);
    const tooLong = "x".repeat(201);
    const result = await finalizeIntakeAction(
      idle,
      fd({
        itemId,
        categoryId,
        cost: "10.00",
        "attr.brand": "Nike",
        "attr.size": "M",
        location: tooLong,
      }),
    );
    expect(result.fieldErrors?.["location"]).toMatch(/200/);
  });
});
