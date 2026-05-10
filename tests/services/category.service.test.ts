// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  AttributeDefinition,
  Category,
  NewAttributeDefinition,
  NewCategory,
} from "@/domain/category";
import {
  ErrConflict,
  ErrInUse,
  ErrNotFound,
  ErrValidation,
} from "@/domain/errors";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import { CategoryService } from "@/services/category.service";
import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../helpers/test-db";

// --- Fakes ------------------------------------------------------------------

function makeFakes() {
  const cats = new Map<string, Category>();
  const defs = new Map<string, AttributeDefinition>();
  let counter = 1;

  const categoriesFake = {
    async findById(id: string): Promise<Category | null> {
      return cats.get(id) ?? null;
    },
    async findByName(name: string): Promise<Category | null> {
      for (const c of cats.values()) {
        if (c.name === name) return c;
      }
      return null;
    },
    async list(): Promise<Category[]> {
      return [...cats.values()].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
    },
    async create(input: NewCategory): Promise<Category> {
      const id = `cat-fake-${counter++}`;
      const row: Category = {
        id,
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        createdAt: new Date(),
      };
      cats.set(id, row);
      return row;
    },
    async update(
      id: string,
      patch: Partial<Pick<NewCategory, "name" | "description" | "sortOrder">>,
    ): Promise<Category | null> {
      const current = cats.get(id);
      if (current === undefined) return null;
      const next: Category = {
        ...current,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description }
          : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      };
      cats.set(id, next);
      return next;
    },
    async delete(id: string): Promise<void> {
      cats.delete(id);
    },
    insert(c: NewCategory & { id: string }) {
      cats.set(c.id, {
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        sortOrder: c.sortOrder ?? 0,
        createdAt: new Date(),
      });
    },
  };

  const attrsFake = {
    async findById(id: string): Promise<AttributeDefinition | null> {
      return defs.get(id) ?? null;
    },
    async listForCategory(categoryId: string): Promise<AttributeDefinition[]> {
      return [...defs.values()]
        .filter((d) => d.categoryId === categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async create(
      input: NewAttributeDefinition,
    ): Promise<AttributeDefinition> {
      const id = `def-fake-${counter++}`;
      const row: AttributeDefinition = {
        id,
        categoryId: input.categoryId,
        key: input.key,
        type: input.type,
        enumOptions: (input.enumOptions ?? null) as string[] | null,
        required: input.required ?? false,
        sortOrder: input.sortOrder ?? 0,
      };
      defs.set(id, row);
      return row;
    },
    async update(
      id: string,
      patch: Partial<
        Pick<
          NewAttributeDefinition,
          "key" | "type" | "enumOptions" | "required" | "sortOrder"
        >
      >,
    ): Promise<AttributeDefinition | null> {
      const current = defs.get(id);
      if (current === undefined) return null;
      const next: AttributeDefinition = {
        ...current,
        ...(patch.key !== undefined ? { key: patch.key } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.enumOptions !== undefined
          ? { enumOptions: patch.enumOptions as string[] | null }
          : {}),
        ...(patch.required !== undefined ? { required: patch.required } : {}),
        ...(patch.sortOrder !== undefined
          ? { sortOrder: patch.sortOrder }
          : {}),
      };
      defs.set(id, next);
      return next;
    },
    async delete(id: string): Promise<void> {
      defs.delete(id);
    },
    insert(def: NewAttributeDefinition & { id: string }) {
      defs.set(def.id, {
        id: def.id,
        categoryId: def.categoryId,
        key: def.key,
        type: def.type,
        enumOptions: (def.enumOptions ?? null) as string[] | null,
        required: def.required ?? false,
        sortOrder: def.sortOrder ?? 0,
      });
    },
  };

  return { categories: categoriesFake, attrs: attrsFake };
}

describe("CategoryService.validateIntake (unit, fakes)", () => {
  it("throws ErrNotFound when the category does not exist", async () => {
    const fakes = makeFakes();
    const svc = new CategoryService(fakes.categories, fakes.attrs);
    await expect(
      svc.validateIntake("01HZZZZZZZZZZZZZZZZZZZZZZZ", {}),
    ).rejects.toBeInstanceOf(ErrNotFound);
  });

  it("returns the category and validated attributes on success", async () => {
    const fakes = makeFakes();
    fakes.categories.insert({ id: "cat-1", name: "Clothing" });
    fakes.attrs.insert({
      id: "def-1",
      categoryId: "cat-1",
      key: "brand",
      type: "text",
      required: true,
    });
    fakes.attrs.insert({
      id: "def-2",
      categoryId: "cat-1",
      key: "size",
      type: "text",
      required: true,
    });
    const svc = new CategoryService(fakes.categories, fakes.attrs);

    const out = await svc.validateIntake("cat-1", {
      brand: "Nike",
      size: "M",
    });

    expect(out.category.id).toBe("cat-1");
    expect(out.attributes).toEqual({ brand: "Nike", size: "M" });
  });

  it("strips unknown attribute keys", async () => {
    const fakes = makeFakes();
    fakes.categories.insert({ id: "cat-1", name: "Clothing" });
    fakes.attrs.insert({
      id: "def-1",
      categoryId: "cat-1",
      key: "brand",
      type: "text",
      required: true,
    });
    const svc = new CategoryService(fakes.categories, fakes.attrs);

    const out = await svc.validateIntake("cat-1", {
      brand: "Nike",
      smuggled: "ignore me",
    });
    expect(out.attributes).toEqual({ brand: "Nike" });
  });

  it("throws ErrValidation with field-level issues on bad input", async () => {
    const fakes = makeFakes();
    fakes.categories.insert({ id: "cat-1", name: "Clothing" });
    fakes.attrs.insert({
      id: "def-1",
      categoryId: "cat-1",
      key: "size",
      type: "enum",
      enumOptions: ["S", "M", "L"],
      required: true,
    });
    const svc = new CategoryService(fakes.categories, fakes.attrs);

    try {
      await svc.validateIntake("cat-1", { size: "XL" });
      throw new Error("expected ErrValidation");
    } catch (err) {
      expect(err).toBeInstanceOf(ErrValidation);
      expect((err as ErrValidation).issues.some((i) => i.includes("size"))).toBe(
        true,
      );
    }
  });

  it("accepts an empty attribute set when the category has no defs", async () => {
    const fakes = makeFakes();
    fakes.categories.insert({ id: "cat-1", name: "Misc" });
    const svc = new CategoryService(fakes.categories, fakes.attrs);
    const out = await svc.validateIntake("cat-1", {});
    expect(out.attributes).toEqual({});
  });
});

// --- Integration: real PGlite -----------------------------------------------

describe("CategoryService.validateIntake (integration, PGlite)", () => {
  let db: TestDb;
  let svc: CategoryService;
  let categoryId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const catRepo = new CategoryRepository(db);
    const defRepo = new AttributeDefinitionRepository(db);
    svc = new CategoryService(catRepo, defRepo);

    const cat = await catRepo.create({ name: "Pokemon Single" });
    categoryId = cat.id;
    await defRepo.create({
      categoryId,
      key: "set",
      type: "text",
      required: true,
    });
    await defRepo.create({
      categoryId,
      key: "condition",
      type: "enum",
      enumOptions: ["NM", "LP", "MP", "HP"],
      required: true,
    });
    await defRepo.create({
      categoryId,
      key: "graded",
      type: "boolean",
      required: false,
    });
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it("validates against a real category + definitions round-trip", async () => {
    const out = await svc.validateIntake(categoryId, {
      set: "Base",
      condition: "NM",
      graded: false,
    });
    expect(out.attributes).toEqual({
      set: "Base",
      condition: "NM",
      graded: false,
    });
  });
});

// --- Admin paths (unit, fakes) ---------------------------------------------

describe("CategoryService — admin paths (fakes)", () => {
  describe("createCategory", () => {
    it("rejects an empty name", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      await expect(
        svc.createCategory({ name: "" }),
      ).rejects.toBeInstanceOf(ErrValidation);
    });

    it("rejects a duplicate name (case-sensitive)", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      await svc.createCategory({ name: "Funko Pops" });
      await expect(
        svc.createCategory({ name: "Funko Pops" }),
      ).rejects.toBeInstanceOf(ErrConflict);
    });

    it("creates a category with description and sortOrder", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({
        name: "Sneakers",
        description: "Boxed kicks, dead-stock and worn",
        sortOrder: 5,
      });
      expect(cat.name).toBe("Sneakers");
      expect(cat.description).toBe("Boxed kicks, dead-stock and worn");
      expect(cat.sortOrder).toBe(5);
    });
  });

  describe("updateCategory", () => {
    it("throws ErrNotFound when the category id is unknown", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      await expect(
        svc.updateCategory("missing", { name: "x" }),
      ).rejects.toBeInstanceOf(ErrNotFound);
    });

    it("rejects a rename that conflicts with an existing name", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const a = await svc.createCategory({ name: "Comics" });
      await svc.createCategory({ name: "Plush" });
      await expect(
        svc.updateCategory(a.id, { name: "Plush" }),
      ).rejects.toBeInstanceOf(ErrConflict);
    });

    it("allows updating description without renaming", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const a = await svc.createCategory({ name: "Vinyl" });
      const updated = await svc.updateCategory(a.id, {
        name: "Vinyl",
        description: "LPs and 7-inches",
      });
      expect(updated.description).toBe("LPs and 7-inches");
    });
  });

  describe("addAttributeDefinition", () => {
    it("throws ErrNotFound when the category id is unknown", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      await expect(
        svc.addAttributeDefinition("missing", {
          key: "brand",
          type: "text",
        }),
      ).rejects.toBeInstanceOf(ErrNotFound);
    });

    it("rejects an invalid key shape", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      await expect(
        svc.addAttributeDefinition(cat.id, {
          key: "Brand Name",
          type: "text",
        }),
      ).rejects.toBeInstanceOf(ErrValidation);
    });

    it("rejects enum without options", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      await expect(
        svc.addAttributeDefinition(cat.id, { key: "format", type: "enum" }),
      ).rejects.toBeInstanceOf(ErrValidation);
    });

    it("rejects enum option longer than the label-printer cap", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      await expect(
        svc.addAttributeDefinition(cat.id, {
          key: "format",
          type: "enum",
          enumOptions: ["LP", "x".repeat(60)],
        }),
      ).rejects.toBeInstanceOf(ErrValidation);
    });

    it("rejects a duplicate key on the same category", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      await svc.addAttributeDefinition(cat.id, {
        key: "speed",
        type: "text",
      });
      await expect(
        svc.addAttributeDefinition(cat.id, {
          key: "speed",
          type: "text",
        }),
      ).rejects.toBeInstanceOf(ErrConflict);
    });

    it("creates a valid enum attribute", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      const def = await svc.addAttributeDefinition(cat.id, {
        key: "format",
        type: "enum",
        enumOptions: ["LP", "EP", "7\""],
        required: true,
      });
      expect(def.type).toBe("enum");
      expect(def.enumOptions).toEqual(["LP", "EP", "7\""]);
      expect(def.required).toBe(true);
    });
  });

  describe("updateAttributeDefinition", () => {
    it("rejects renaming to a key that already exists on the same category", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      await svc.addAttributeDefinition(cat.id, { key: "speed", type: "text" });
      const second = await svc.addAttributeDefinition(cat.id, {
        key: "label",
        type: "text",
      });
      await expect(
        svc.updateAttributeDefinition(second.id, {
          key: "speed",
          type: "text",
        }),
      ).rejects.toBeInstanceOf(ErrConflict);
    });

    it("allows widening from required to optional", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      const def = await svc.addAttributeDefinition(cat.id, {
        key: "color",
        type: "text",
        required: true,
      });
      const updated = await svc.updateAttributeDefinition(def.id, {
        key: "color",
        type: "text",
        required: false,
      });
      expect(updated.required).toBe(false);
    });
  });

  describe("deleteAttributeDefinition", () => {
    it("throws ErrNotFound when id is unknown", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      await expect(
        svc.deleteAttributeDefinition("missing"),
      ).rejects.toBeInstanceOf(ErrNotFound);
    });

    it("removes the definition", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      const cat = await svc.createCategory({ name: "Vinyl" });
      const def = await svc.addAttributeDefinition(cat.id, {
        key: "color",
        type: "text",
      });
      await svc.deleteAttributeDefinition(def.id);
      const remaining = await svc.getDefinitions(cat.id);
      expect(remaining).toHaveLength(0);
    });
  });

  describe("deleteCategory", () => {
    it("throws ErrNotFound when id is unknown", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs);
      await expect(
        svc.deleteCategory("missing"),
      ).rejects.toBeInstanceOf(ErrNotFound);
    });

    it("deletes when no items reference the category", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs, {
        async countByCategory() {
          return 0;
        },
      });
      const cat = await svc.createCategory({ name: "Vinyl" });
      await svc.deleteCategory(cat.id);
      expect(await fakes.categories.findById(cat.id)).toBeNull();
    });

    it("throws ErrInUse when items still reference the category", async () => {
      const fakes = makeFakes();
      const svc = new CategoryService(fakes.categories, fakes.attrs, {
        async countByCategory() {
          return 3;
        },
      });
      const cat = await svc.createCategory({ name: "Vinyl" });
      await expect(
        svc.deleteCategory(cat.id),
      ).rejects.toBeInstanceOf(ErrInUse);
    });
  });
});

// --- Admin paths (integration, real PGlite + FK) ---------------------------

describe("CategoryService — admin paths (integration, PGlite)", () => {
  let db: TestDb;
  let svc: CategoryService;

  beforeEach(async () => {
    db = await createTestDb();
    const catRepo = new CategoryRepository(db);
    const defRepo = new AttributeDefinitionRepository(db);
    const itemRepo = new ItemRepository(db);
    svc = new CategoryService(catRepo, defRepo, itemRepo);
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it("create → add attributes → use in intake validation round-trip", async () => {
    const cat = await svc.createCategory({
      name: "Funko Pops",
      description: "Vinyl figures, common and exclusive",
    });
    await svc.addAttributeDefinition(cat.id, {
      key: "series",
      type: "text",
      required: true,
    });
    await svc.addAttributeDefinition(cat.id, {
      key: "edition",
      type: "enum",
      enumOptions: ["Common", "Chase", "Exclusive"],
      required: true,
    });

    const validated = await svc.validateIntake(cat.id, {
      series: "Marvel",
      edition: "Chase",
    });
    expect(validated.attributes).toEqual({
      series: "Marvel",
      edition: "Chase",
    });
  });

  it("deleteCategory rejects with ErrInUse when an item references it", async () => {
    const cat = await svc.createCategory({ name: "Comics" });
    await new ItemRepository(db).create({
      categoryId: cat.id,
      attributes: {},
    });
    await expect(
      svc.deleteCategory(cat.id),
    ).rejects.toBeInstanceOf(ErrInUse);
  });

  it("deleteAttributeDefinition removes the row but leaves item JSONB data", async () => {
    const cat = await svc.createCategory({ name: "Vinyl Records" });
    const def = await svc.addAttributeDefinition(cat.id, {
      key: "color",
      type: "text",
    });
    const item = await new ItemRepository(db).create({
      categoryId: cat.id,
      attributes: { color: "red" },
    });

    await svc.deleteAttributeDefinition(def.id);
    expect(await svc.getDefinitions(cat.id)).toHaveLength(0);

    const fresh = await new ItemRepository(db).findById(item.id);
    // The historical attribute value is preserved — schema evolution
    // doesn't retroactively scrub data.
    expect(fresh?.attributes).toEqual({ color: "red" });
  });
});
