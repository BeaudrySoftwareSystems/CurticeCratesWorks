// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CategoryRepository } from "@/repositories/category.repository";
import {
  closeTestDb,
  createTestDb,
  type TestDb,
} from "../helpers/test-db";

describe("CategoryRepository", () => {
  let db: TestDb;
  let repo: CategoryRepository;

  beforeEach(async () => {
    db = await createTestDb();
    repo = new CategoryRepository(db);
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it("create + findById round-trips", async () => {
    const created = await repo.create({ name: "Clothing" });
    expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(created.name).toBe("Clothing");
    const found = await repo.findById(created.id);
    expect(found?.name).toBe("Clothing");
  });

  it("findById returns null for an unknown id", async () => {
    expect(await repo.findById("01HZZZZZZZZZZZZZZZZZZZZZZZ")).toBeNull();
  });

  it("findByName is case-sensitive and returns null when missing", async () => {
    await repo.create({ name: "Pokemon Single" });
    expect((await repo.findByName("Pokemon Single"))?.name).toBe(
      "Pokemon Single",
    );
    expect(await repo.findByName("pokemon single")).toBeNull();
  });

  it("list returns rows ordered by sortOrder ASC then name ASC", async () => {
    await repo.create({ name: "Z-cat", sortOrder: 1 });
    await repo.create({ name: "A-cat", sortOrder: 1 });
    await repo.create({ name: "M-cat", sortOrder: 0 });

    const rows = await repo.list();
    expect(rows.map((r) => r.name)).toEqual(["M-cat", "A-cat", "Z-cat"]);
  });

  it("rejects duplicate category names (DB-level unique)", async () => {
    await repo.create({ name: "Clothing" });
    await expect(repo.create({ name: "Clothing" })).rejects.toThrow();
  });
});
