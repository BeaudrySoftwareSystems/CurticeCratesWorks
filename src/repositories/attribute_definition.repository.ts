import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attributeDefinitions } from "@/db/schema";
import type {
  AttributeDefinition,
  NewAttributeDefinition,
} from "@/domain/category";

/**
 * Pure persistence for the `attribute_definitions` table.
 *
 * Reads are scoped per-category (the typical access pattern is "fetch all
 * defs for category X to build a Zod schema"). The unique constraint on
 * (category_id, key) is enforced at the DB level — service-layer callers
 * surface insertion failures as `ErrValidation`.
 */
export class AttributeDefinitionRepository {
  constructor(private readonly db: Db) {}

  async listForCategory(
    categoryId: string,
    tx?: Db,
  ): Promise<AttributeDefinition[]> {
    const handle = tx ?? this.db;
    return handle
      .select()
      .from(attributeDefinitions)
      .where(eq(attributeDefinitions.categoryId, categoryId))
      .orderBy(asc(attributeDefinitions.sortOrder), asc(attributeDefinitions.key));
  }

  async create(
    input: NewAttributeDefinition,
    tx?: Db,
  ): Promise<AttributeDefinition> {
    const handle = tx ?? this.db;
    const [row] = await handle
      .insert(attributeDefinitions)
      .values(input)
      .returning();
    if (row === undefined) {
      throw new Error("attribute definition insert returned no row");
    }
    return row;
  }
}
