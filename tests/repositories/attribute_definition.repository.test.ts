// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../helpers/test-db";

describe("AttributeDefinitionRepository", () => {
  let db: TestDb;
  let repo: AttributeDefinitionRepository;
  let categoryId: string;

  beforeEach(async () => {
    db = await createTestDb();
    repo = new AttributeDefinitionRepository(db);
    const cat = await new CategoryRepository(db).create({ name: "Clothing" });
    categoryId = cat.id;
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it("creates and lists definitions in sortOrder ASC", async () => {
    await repo.create({
      categoryId,
      key: "size",
      type: "text",
      required: true,
      sortOrder: 2,
    });
    await repo.create({
      categoryId,
      key: "brand",
      type: "text",
      required: true,
      sortOrder: 1,
    });

    const rows = await repo.listForCategory(categoryId);
    expect(rows.map((r) => r.key)).toEqual(["brand", "size"]);
  });

  it("listForCategory returns an empty array when none exist", async () => {
    expect(await repo.listForCategory(categoryId)).toEqual([]);
  });

  it("listForCategory does not return other categories' definitions", async () => {
    const other = await new CategoryRepository(db).create({ name: "Shoes" });
    await repo.create({
      categoryId: other.id,
      key: "size",
      type: "text",
      required: true,
    });
    expect(await repo.listForCategory(categoryId)).toEqual([]);
  });

  it("rejects duplicate (categoryId, key)", async () => {
    await repo.create({
      categoryId,
      key: "size",
      type: "text",
      required: true,
    });
    await expect(
      repo.create({
        categoryId,
        key: "size",
        type: "text",
        required: false,
      }),
    ).rejects.toThrow();
  });
});
