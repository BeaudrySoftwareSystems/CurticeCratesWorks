import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";

// --- Enums ------------------------------------------------------------------

/**
 * v1 lifecycle: stocked → sold → archived. The `listed` state was dropped
 * from v1 (no UI action would set it; v2 sync will add it back).
 */
export const itemStatusEnum = pgEnum("item_status", [
  "stocked",
  "sold",
  "archived",
]);

/**
 * Closed enum for v1. `Other` means "platform we don't enumerate"; a NULL
 * value (column is nullable) means "not yet known" and is the deliberate
 * brainstorm distinction.
 */
export const soldPlatformEnum = pgEnum("sold_platform", [
  "Depop",
  "Poshmark",
  "eBay",
  "Other",
]);

/**
 * Typed attributes per category. Drives runtime form rendering and dynamic
 * Zod schema construction in `categoryService.validateIntake`.
 */
export const attributeTypeEnum = pgEnum("attribute_type", [
  "text",
  "number",
  "decimal",
  "boolean",
  "enum",
]);

// --- Categories -------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey().$defaultFn(() => ulid()),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("categories_name_unique").on(table.name)],
);

// --- Attribute definitions --------------------------------------------------

/**
 * Per-category typed attribute schema. Adding a category = inserting rows here
 * (data, not code). The Service layer builds a Zod schema from these rows
 * at intake time.
 */
export const attributeDefinitions = pgTable(
  "attribute_definitions",
  {
    id: text("id").primaryKey().$defaultFn(() => ulid()),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    type: attributeTypeEnum("type").notNull(),
    /** Only populated when `type = 'enum'`. */
    enumOptions: text("enum_options").array(),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("attribute_definitions_category_key_unique").on(
      table.categoryId,
      table.key,
    ),
  ],
);

// --- Items ------------------------------------------------------------------

/**
 * The core inventory record.
 *
 * - `id` is a ULID, used everywhere in app routes (`/items/[id]`) and barcode
 *   payloads. Opaque to prevent enumeration.
 * - `displayId` is a human-readable sequential integer shown on labels and in
 *   the UI. Never appears in URLs.
 * - `attributes` is a JSONB blob validated against the category's
 *   `attributeDefinitions` at intake time by the Service layer.
 * - `intakeSkipped = true` items come from the quick-record-sale path —
 *   they bypass attribute validation by design and must be in `sold` status.
 */
export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey().$defaultFn(() => ulid()),
    displayId: bigserial("display_id", { mode: "number" }).notNull().unique(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    location: text("location"),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    listPrice: numeric("list_price", { precision: 12, scale: 2 }),
    status: itemStatusEnum("status").notNull().default("stocked"),
    intakeSkipped: boolean("intake_skipped").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    /**
     * intake_skipped = true is only valid when the item is in `sold` status.
     * Quick-record-sale produces these; nothing else should.
     */
    check(
      "items_intake_skipped_requires_sold",
      sql`${table.intakeSkipped} = false OR ${table.status} = 'sold'`,
    ),
  ],
);

// --- Photos -----------------------------------------------------------------

/**
 * v1 stores a single photo variant per row (no separate thumbnail column —
 * see plan scope decision). The DB stores the raw blob path; the Service
 * layer signs URLs at read time so we don't persist stale signed URLs.
 */
export const photos = pgTable("photos", {
  id: text("id").primaryKey().$defaultFn(() => ulid()),
  itemId: text("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  blobPath: text("blob_path").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Sales ------------------------------------------------------------------

/**
 * One sales row per item (1:0..1 relation). Item rows are preserved on sale
 * so the catalog retains the historical record.
 */
export const sales = pgTable(
  "sales",
  {
    id: text("id").primaryKey().$defaultFn(() => ulid()),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    soldPrice: numeric("sold_price", { precision: 12, scale: 2 }).notNull(),
    soldAt: timestamp("sold_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    platform: soldPlatformEnum("platform"),
    buyerReference: text("buyer_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("sales_item_id_unique").on(table.itemId)],
);

// --- Type exports for downstream consumers ----------------------------------

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type AttributeDefinition = typeof attributeDefinitions.$inferSelect;
export type NewAttributeDefinition = typeof attributeDefinitions.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
