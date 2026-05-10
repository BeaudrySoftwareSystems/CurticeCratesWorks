import type { AttributeDefinition, Category } from "@/domain/category";
import { ErrNotFound, ErrValidation } from "@/domain/errors";
import { buildZodSchema } from "@/lib/attributes";

/**
 * Repository capabilities the service depends on. Defined here per the
 * project's "interfaces at the consumer" rule (CLAUDE.md, ISP) — the
 * concrete `CategoryRepository` / `AttributeDefinitionRepository` classes
 * structurally satisfy these.
 */
export interface CategoryReader {
  findById(id: string): Promise<Category | null>;
}

export interface AttributeDefinitionReader {
  listForCategory(categoryId: string): Promise<AttributeDefinition[]>;
}

export interface ValidatedIntake {
  category: Category;
  attributes: Record<string, unknown>;
}

/**
 * Owns the dynamic intake-validation seam.
 *
 * `validateIntake` is the single public method called by the intake Server
 * Action. It encapsulates: fetch category + definitions → build Zod schema
 * → parse raw attributes → return the typed result. This is what keeps the
 * Server Action a thin pass-through (CLAUDE.md / plan B5) — the action does
 * not know about Zod, attribute_definitions, or per-category rules.
 *
 * Failures are surfaced as domain errors:
 *   - `ErrNotFound` if the category is unknown.
 *   - `ErrValidation` (with field-level issue strings) if the attributes
 *     fail the dynamic schema.
 */
export class CategoryService {
  constructor(
    private readonly categories: CategoryReader,
    private readonly attrs: AttributeDefinitionReader,
  ) {}

  async validateIntake(
    categoryId: string,
    rawAttributes: Record<string, unknown>,
  ): Promise<ValidatedIntake> {
    const category = await this.categories.findById(categoryId);
    if (category === null) {
      throw new ErrNotFound("category", categoryId);
    }

    const definitions = await this.attrs.listForCategory(categoryId);
    const schema = buildZodSchema(definitions);
    const result = schema.safeParse(rawAttributes);
    if (!result.success) {
      throw new ErrValidation(
        result.error.issues.map((issue) => {
          const path = issue.path.join(".") || "(root)";
          return `${path}: ${issue.message}`;
        }),
      );
    }

    return { category, attributes: result.data };
  }
}
