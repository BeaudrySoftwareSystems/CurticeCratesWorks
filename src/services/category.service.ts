import type {
  AttributeDefinition,
  AttributeType,
  Category,
  NewAttributeDefinition,
  NewCategory,
} from "@/domain/category";
import {
  ENUM_OPTION_MAX_LENGTH,
  TEXT_MAX_LENGTH,
} from "@/domain/category";
import {
  ErrConflict,
  ErrInUse,
  ErrNotFound,
  ErrValidation,
} from "@/domain/errors";
import { buildZodSchema } from "@/lib/attributes";

/**
 * Repository capabilities the service depends on. Defined here per the
 * project's "interfaces at the consumer" rule (CLAUDE.md, ISP) — the
 * concrete `CategoryRepository` / `AttributeDefinitionRepository` classes
 * structurally satisfy these.
 */
export interface CategoryReader {
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  list(): Promise<Category[]>;
}

export interface CategoryWriter {
  create(input: NewCategory): Promise<Category>;
  update(
    id: string,
    patch: Partial<Pick<NewCategory, "name" | "description" | "sortOrder">>,
  ): Promise<Category | null>;
  delete(id: string): Promise<void>;
}

export interface AttributeDefinitionReader {
  findById(id: string): Promise<AttributeDefinition | null>;
  listForCategory(categoryId: string): Promise<AttributeDefinition[]>;
}

export interface AttributeDefinitionWriter {
  create(input: NewAttributeDefinition): Promise<AttributeDefinition>;
  update(
    id: string,
    patch: Partial<
      Pick<
        NewAttributeDefinition,
        "key" | "type" | "enumOptions" | "required" | "sortOrder"
      >
    >,
  ): Promise<AttributeDefinition | null>;
  delete(id: string): Promise<void>;
}

/**
 * Counts items for a category. Used by `deleteCategory` to surface a
 * meaningful `ErrInUse` instead of letting the FK constraint bubble up
 * from the driver. Defined as its own interface so the test fakes don't
 * need to pull in the whole ItemRepository.
 */
export interface ItemReferenceCounter {
  countByCategory(categoryId: string): Promise<number>;
}

export interface ValidatedIntake {
  category: Category;
  attributes: Record<string, unknown>;
}

export interface CategoryInput {
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export interface AttributeDefinitionInput {
  key: string;
  type: AttributeType;
  required?: boolean;
  enumOptions?: readonly string[] | null;
  sortOrder?: number;
}

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const NAME_MAX = 80;
const DESCRIPTION_MAX = 200;

/**
 * Owns the dynamic intake-validation seam AND the admin lifecycle for
 * categories + attribute definitions. The admin paths (create/update/
 * delete) raise `ErrValidation` for shape failures, `ErrConflict` for
 * unique-constraint violations, `ErrInUse` when deletes are blocked by
 * referencing data, and `ErrNotFound` for missing rows.
 */
export class CategoryService {
  constructor(
    private readonly categories: CategoryReader & CategoryWriter,
    private readonly attrs: AttributeDefinitionReader & AttributeDefinitionWriter,
    private readonly items?: ItemReferenceCounter,
  ) {}

  // --- Read seam used by the intake Server Action -------------------------

  /**
   * Public accessor used by the intake Server Action to coerce FormData
   * strings (e.g. "12" → 12, "on" → true) into the shapes the dynamic
   * schema expects.
   */
  async getDefinitions(categoryId: string): Promise<AttributeDefinition[]> {
    return this.attrs.listForCategory(categoryId);
  }

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

  // --- Admin paths --------------------------------------------------------

  async listCategories(): Promise<Category[]> {
    return this.categories.list();
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    validateCategoryInput(input);
    const existing = await this.categories.findByName(input.name);
    if (existing !== null) {
      throw new ErrConflict("name", `Category "${input.name}" already exists`);
    }
    return this.categories.create({
      name: input.name,
      ...(input.description !== undefined && input.description !== null
        ? { description: input.description }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    });
  }

  async updateCategory(id: string, input: CategoryInput): Promise<Category> {
    validateCategoryInput(input);
    const current = await this.categories.findById(id);
    if (current === null) {
      throw new ErrNotFound("category", id);
    }
    if (input.name !== current.name) {
      const conflict = await this.categories.findByName(input.name);
      if (conflict !== null) {
        throw new ErrConflict(
          "name",
          `Category "${input.name}" already exists`,
        );
      }
    }
    const updated = await this.categories.update(id, {
      name: input.name,
      description:
        input.description === undefined ? null : (input.description ?? null),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    });
    if (updated === null) {
      throw new ErrNotFound("category", id);
    }
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const current = await this.categories.findById(id);
    if (current === null) {
      throw new ErrNotFound("category", id);
    }
    if (this.items !== undefined) {
      const refs = await this.items.countByCategory(id);
      if (refs > 0) {
        throw new ErrInUse("category", id, refs);
      }
    }
    await this.categories.delete(id);
  }

  // --- Attribute definition admin -----------------------------------------

  async addAttributeDefinition(
    categoryId: string,
    input: AttributeDefinitionInput,
  ): Promise<AttributeDefinition> {
    const category = await this.categories.findById(categoryId);
    if (category === null) {
      throw new ErrNotFound("category", categoryId);
    }
    validateAttributeDefinitionInput(input);

    const existing = await this.attrs.listForCategory(categoryId);
    if (existing.some((d) => d.key === input.key)) {
      throw new ErrConflict(
        "key",
        `Attribute "${input.key}" already exists on this category`,
      );
    }

    return this.attrs.create({
      categoryId,
      key: input.key,
      type: input.type,
      ...(input.enumOptions !== undefined && input.enumOptions !== null
        ? { enumOptions: [...input.enumOptions] }
        : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    });
  }

  async updateAttributeDefinition(
    id: string,
    input: AttributeDefinitionInput,
  ): Promise<AttributeDefinition> {
    const current = await this.attrs.findById(id);
    if (current === null) {
      throw new ErrNotFound("attribute_definition", id);
    }
    validateAttributeDefinitionInput(input);

    if (input.key !== current.key) {
      const siblings = await this.attrs.listForCategory(current.categoryId);
      if (siblings.some((d) => d.id !== id && d.key === input.key)) {
        throw new ErrConflict(
          "key",
          `Attribute "${input.key}" already exists on this category`,
        );
      }
    }

    const updated = await this.attrs.update(id, {
      key: input.key,
      type: input.type,
      enumOptions:
        input.enumOptions === undefined || input.enumOptions === null
          ? null
          : [...input.enumOptions],
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    });
    if (updated === null) {
      throw new ErrNotFound("attribute_definition", id);
    }
    return updated;
  }

  async deleteAttributeDefinition(id: string): Promise<void> {
    const current = await this.attrs.findById(id);
    if (current === null) {
      throw new ErrNotFound("attribute_definition", id);
    }
    await this.attrs.delete(id);
  }
}

// --- Internal validators ----------------------------------------------------

function validateCategoryInput(input: CategoryInput): void {
  const issues: string[] = [];
  if (typeof input.name !== "string" || input.name.trim() === "") {
    issues.push("name: required");
  } else if (input.name.length > NAME_MAX) {
    issues.push(`name: must be ${NAME_MAX} characters or fewer`);
  }
  if (
    input.description !== undefined &&
    input.description !== null &&
    input.description.length > DESCRIPTION_MAX
  ) {
    issues.push(`description: must be ${DESCRIPTION_MAX} characters or fewer`);
  }
  if (input.sortOrder !== undefined && !Number.isInteger(input.sortOrder)) {
    issues.push("sortOrder: must be an integer");
  }
  if (issues.length > 0) {
    throw new ErrValidation(issues);
  }
}

function validateAttributeDefinitionInput(
  input: AttributeDefinitionInput,
): void {
  const issues: string[] = [];
  if (typeof input.key !== "string" || input.key.trim() === "") {
    issues.push("key: required");
  } else if (!KEY_PATTERN.test(input.key)) {
    issues.push(
      "key: must start with a lowercase letter and contain only lowercase letters, digits, and underscores",
    );
  }
  if (input.type === undefined) {
    issues.push("type: required");
  } else if (
    !["text", "number", "decimal", "boolean", "enum"].includes(input.type)
  ) {
    issues.push(`type: invalid (${input.type})`);
  }
  if (input.type === "enum") {
    if (
      input.enumOptions === undefined ||
      input.enumOptions === null ||
      input.enumOptions.length === 0
    ) {
      issues.push("enumOptions: required for enum type");
    } else {
      for (const opt of input.enumOptions) {
        if (typeof opt !== "string" || opt.trim() === "") {
          issues.push("enumOptions: every option must be a non-empty string");
          break;
        }
        if (opt.length > ENUM_OPTION_MAX_LENGTH) {
          issues.push(
            `enumOptions: every option must be ${ENUM_OPTION_MAX_LENGTH} characters or fewer (label-printer constraint)`,
          );
          break;
        }
      }
    }
  }
  if (input.sortOrder !== undefined && !Number.isInteger(input.sortOrder)) {
    issues.push("sortOrder: must be an integer");
  }
  void TEXT_MAX_LENGTH; // exported for symmetry; not validated here
  if (issues.length > 0) {
    throw new ErrValidation(issues);
  }
}
