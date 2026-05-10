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
  createAttributeDefinitionAction,
  createCategoryAction,
  deleteAttributeDefinitionAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from "@/app/actions/categories";

const idle: CategoryFormState = { status: "idle" };

let testDb: TestDb;

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    f.append(k, v);
  }
  return f;
}

beforeEach(async () => {
  testDb = await createTestDb();
  mocks.dbHandle.current = testDb;
  mocks.authMock.mockResolvedValue({ user: { email: "staff@example.com" } });
  mocks.redirectMock.mockClear();
  mocks.revalidatePathMock.mockClear();
});

afterEach(async () => {
  await closeTestDb(testDb);
});

describe("createCategoryAction", () => {
  it("rejects when there is no session", async () => {
    mocks.authMock.mockResolvedValueOnce(null);
    const result = await createCategoryAction(idle, fd({ name: "Vinyl" }));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/sign in/i);
  });

  it("returns a fieldError when name is empty", async () => {
    const result = await createCategoryAction(idle, fd({ name: "" }));
    expect(result.fieldErrors?.["name"]).toMatch(/required/i);
  });

  it("returns a fieldError on duplicate name", async () => {
    await new CategoryRepository(testDb).create({ name: "Comics" });
    const result = await createCategoryAction(idle, fd({ name: "Comics" }));
    expect(result.fieldErrors?.["name"]).toMatch(/already exists/i);
  });

  it("creates the category and redirects to its edit page", async () => {
    let thrown: string | null = null;
    try {
      await createCategoryAction(
        idle,
        fd({
          name: "Sneakers",
          description: "Boxed kicks",
          sortOrder: "5",
        }),
      );
    } catch (err) {
      thrown = (err as Error).message;
    }
    expect(thrown).toMatch(/^__redirect__:\/admin\/categories\//);
    const cats = await new CategoryRepository(testDb).list();
    expect(cats.find((c) => c.name === "Sneakers")?.sortOrder).toBe(5);
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/admin/categories");
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/intake");
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith("/(warehouse)");
  });
});

describe("updateCategoryAction", () => {
  it("returns a Saved success message when the rename succeeds", async () => {
    const cat = await new CategoryRepository(testDb).create({
      name: "Vinyl",
    });
    const result = await updateCategoryAction(
      cat.id,
      idle,
      fd({ name: "Vinyl Records" }),
    );
    expect(result.status).toBe("idle");
    expect(result.message).toMatch(/saved/i);
  });

  it("returns a fieldError when renaming to an existing name", async () => {
    const a = await new CategoryRepository(testDb).create({ name: "Comics" });
    await new CategoryRepository(testDb).create({ name: "Plush" });
    const result = await updateCategoryAction(
      a.id,
      idle,
      fd({ name: "Plush" }),
    );
    expect(result.fieldErrors?.["name"]).toMatch(/already exists/i);
  });
});

describe("deleteCategoryAction", () => {
  it("rejects with a message when items still reference the category", async () => {
    const cat = await new CategoryRepository(testDb).create({
      name: "Comics",
    });
    await new ItemRepository(testDb).create({
      categoryId: cat.id,
      attributes: {},
    });
    const result = await deleteCategoryAction(cat.id);
    expect(result).toEqual({
      ok: false,
      message: expect.stringMatching(/still use/i),
    });
  });

  it("redirects to the list when the delete succeeds", async () => {
    const cat = await new CategoryRepository(testDb).create({ name: "Plush" });
    let thrown: string | null = null;
    try {
      await deleteCategoryAction(cat.id);
    } catch (err) {
      thrown = (err as Error).message;
    }
    expect(thrown).toBe("__redirect__:/admin/categories");
  });
});

describe("createAttributeDefinitionAction", () => {
  it("rejects an invalid key shape with a fieldError", async () => {
    const cat = await new CategoryRepository(testDb).create({ name: "Vinyl" });
    const result = await createAttributeDefinitionAction(
      cat.id,
      idle,
      fd({ key: "Brand Name", type: "text" }),
    );
    expect(result.fieldErrors?.["key"]).toMatch(/lowercase/i);
  });

  it("rejects enum without options", async () => {
    const cat = await new CategoryRepository(testDb).create({ name: "Vinyl" });
    const result = await createAttributeDefinitionAction(
      cat.id,
      idle,
      fd({ key: "format", type: "enum" }),
    );
    expect(result.fieldErrors?.["enumOptions"]).toMatch(/required/i);
  });

  it("creates an enum attribute parsed from a newline-delimited textarea", async () => {
    const cat = await new CategoryRepository(testDb).create({ name: "Vinyl" });
    const result = await createAttributeDefinitionAction(
      cat.id,
      idle,
      fd({
        key: "format",
        type: "enum",
        required: "on",
        enumOptions: "LP\nEP\n7\"\n12\"",
      }),
    );
    expect(result.status).toBe("idle");
    const defs = await new (
      await import("@/repositories/attribute_definition.repository")
    ).AttributeDefinitionRepository(testDb).listForCategory(cat.id);
    expect(defs[0]?.enumOptions).toEqual(["LP", "EP", "7\"", "12\""]);
    expect(defs[0]?.required).toBe(true);
  });
});

describe("deleteAttributeDefinitionAction", () => {
  it("returns ok and removes the definition", async () => {
    const cat = await new CategoryRepository(testDb).create({ name: "Vinyl" });
    const created = await createAttributeDefinitionAction(
      cat.id,
      idle,
      fd({ key: "color", type: "text" }),
    );
    expect(created.status).toBe("idle");
    const defs = await new (
      await import("@/repositories/attribute_definition.repository")
    ).AttributeDefinitionRepository(testDb).listForCategory(cat.id);
    expect(defs).toHaveLength(1);

    const result = await deleteAttributeDefinitionAction(defs[0]!.id, cat.id);
    expect(result).toEqual({ ok: true });
  });
});
