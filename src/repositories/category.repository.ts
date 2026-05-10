import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { categories } from "@/db/schema";
import type { Category, NewCategory } from "@/domain/category";

/**
 * Pure persistence for the `categories` table. Categories drive the dynamic
 * intake schema (see `categoryService.validateIntake` and Unit 3 seed data),
 * so the read-side surface is small: lookup by id, lookup by name (admin
 * tooling), and ordered list (for the intake category picker).
 */
export class CategoryRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string, tx?: Db): Promise<Category | null> {
    const handle = tx ?? this.db;
    const rows = await handle
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return rows[0] ?? null;
  }

  async findByName(name: string, tx?: Db): Promise<Category | null> {
    const handle = tx ?? this.db;
    const rows = await handle
      .select()
      .from(categories)
      .where(eq(categories.name, name));
    return rows[0] ?? null;
  }

  async list(tx?: Db): Promise<Category[]> {
    const handle = tx ?? this.db;
    return handle
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async create(input: NewCategory, tx?: Db): Promise<Category> {
    const handle = tx ?? this.db;
    const [row] = await handle.insert(categories).values(input).returning();
    if (row === undefined) {
      throw new Error("category insert returned no row");
    }
    return row;
  }
}
