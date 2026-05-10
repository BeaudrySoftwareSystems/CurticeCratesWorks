// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  AttributeDefinition,
  Category,
  NewAttributeDefinition,
  NewCategory,
} from "@/domain/category";
import { ErrNotFound, ErrValidation } from "@/domain/errors";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { CategoryService } from "@/services/category.service";
import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../helpers/test-db";

// --- Fakes ------------------------------------------------------------------

function makeFakes(): {
  categories: {
    findById: (id: string) => Promise<Category | null>;
    insert: (c: NewCategory & { id: string }) => void;
  };
  attrs: {
    listForCategory: (categoryId: string) => Promise<AttributeDefinition[]>;
    insert: (def: NewAttributeDefinition & { id: string }) => void;
  };
} {
  const cats = new Map<string, Category>();
  const defs = new Map<string, AttributeDefinition>();

  return {
    categories: {
      async findById(id: string) {
        return cats.get(id) ?? null;
      },
      insert(c) {
        cats.set(c.id, {
          id: c.id,
          name: c.name,
          description: c.description ?? null,
          sortOrder: c.sortOrder ?? 0,
          createdAt: new Date(),
        });
      },
    },
    attrs: {
      async listForCategory(categoryId: string) {
        return [...defs.values()]
          .filter((d) => d.categoryId === categoryId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },
      insert(def) {
        defs.set(def.id, {
          id: def.id,
          categoryId: def.categoryId,
          key: def.key,
          type: def.type,
          enumOptions: def.enumOptions ?? null,
          required: def.required ?? false,
          sortOrder: def.sortOrder ?? 0,
        });
      },
    },
  };
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
