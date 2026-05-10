import { z } from "zod";
import {
  ENUM_OPTION_MAX_LENGTH,
  TEXT_MAX_LENGTH,
  type AttributeDefinition,
} from "@/domain/category";

/**
 * Build a runtime Zod schema from a category's attribute definitions.
 *
 * The intake Server Action receives an opaque `categoryId` plus a free-form
 * payload; this builder is what turns the per-category attribute rules
 * (stored as data, not code) into a strict validator. The result is parsed
 * once in `categoryService.validateIntake`, which is the single seam that
 * keeps the Server Action a thin pass-through.
 *
 * Pure function, no side effects, no I/O — heavily unit-tested.
 *
 * Type mapping:
 *   text     → z.string().max(TEXT_MAX_LENGTH)
 *   number   → z.number()
 *   decimal  → z.number()  (precision refinement deferred — v1 stores as
 *              numeric(12,2) and the DB-level cast handles it)
 *   boolean  → z.boolean()
 *   enum     → z.enum(definition.enumOptions)
 *
 * `required: true` → property is required.
 * `required: false` → property is optional.
 *
 * Unknown keys in the input are stripped (zod's default `strip` mode) so
 * callers cannot smuggle untyped attributes into the JSONB blob.
 */
export function buildZodSchema(
  definitions: readonly AttributeDefinition[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const def of definitions) {
    const base = baseTypeFor(def);
    shape[def.key] = def.required ? base : base.optional();
  }

  return z.object(shape);
}

function baseTypeFor(def: AttributeDefinition): z.ZodTypeAny {
  switch (def.type) {
    case "text":
      return z.string().max(TEXT_MAX_LENGTH);
    case "number":
    case "decimal":
      return z.number();
    case "boolean":
      return z.boolean();
    case "enum":
      return enumSchema(def);
  }
}

function enumSchema(def: AttributeDefinition): z.ZodTypeAny {
  const options = def.enumOptions;
  if (options === null || options.length === 0) {
    throw new Error(
      `attribute definition ${def.key} (${def.id}) is type 'enum' but has no enumOptions`,
    );
  }
  for (const opt of options) {
    if (opt.length > ENUM_OPTION_MAX_LENGTH) {
      throw new Error(
        `attribute definition ${def.key} (${def.id}) has enum option exceeding ${ENUM_OPTION_MAX_LENGTH} chars: ${opt}`,
      );
    }
  }
  // z.enum requires a non-empty tuple type; cast after the runtime check.
  return z.enum(options as [string, ...string[]]);
}
