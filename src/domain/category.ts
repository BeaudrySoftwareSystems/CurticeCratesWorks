/**
 * Category + attribute-definition domain types.
 *
 * Re-exports the Drizzle-inferred shapes so service / handler code never
 * reaches into `@/db/schema` directly. Length caps are part of the domain
 * (not just persistence) — the same caps apply to free-form fields like
 * `location` and `buyer_reference` elsewhere in the system.
 */
import type {
  AttributeDefinition as DbAttributeDefinition,
  Category as DbCategory,
  NewAttributeDefinition as DbNewAttributeDefinition,
  NewCategory as DbNewCategory,
  attributeTypeEnum,
} from "@/db/schema";

export type Category = DbCategory;
export type NewCategory = DbNewCategory;
export type AttributeDefinition = DbAttributeDefinition;
export type NewAttributeDefinition = DbNewAttributeDefinition;

export type AttributeType = (typeof attributeTypeEnum.enumValues)[number];

/**
 * Domain-wide length caps for free-form text. These are not arbitrary —
 * they're driven by the label-rendering constraint (we print attribute
 * values onto a 2-inch thermal label and need predictable widths).
 *
 * Applies to text-typed attribute values, individual enum option labels,
 * and free-form fields like `items.location` and `sales.buyer_reference`.
 */
export const TEXT_MAX_LENGTH = 200;
export const ENUM_OPTION_MAX_LENGTH = 50;
