/**
 * Seed the v1 categories and attribute definitions. Idempotent — running it
 * twice does not duplicate rows or fail.
 *
 *     bun run db:seed
 *
 * Requires DATABASE_URL. Run after `bun run db:migrate`.
 */

import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, attributeDefinitions } from "@/db/schema";

interface AttributeSeed {
  key: string;
  type: "text" | "number" | "decimal" | "boolean" | "enum";
  required?: boolean;
  enumOptions?: string[];
  sortOrder: number;
}

interface CategorySeed {
  name: string;
  description: string;
  sortOrder: number;
  attributes: AttributeSeed[];
}

const SEED: CategorySeed[] = [
  {
    name: "Clothing",
    description: "Apparel — jeans, shirts, jackets, dresses, etc.",
    sortOrder: 0,
    attributes: [
      { key: "brand", type: "text", required: true, sortOrder: 0 },
      { key: "style", type: "text", required: false, sortOrder: 1 },
      { key: "size", type: "text", required: true, sortOrder: 2 },
      {
        key: "condition",
        type: "enum",
        enumOptions: ["NWT", "NWOT", "Excellent", "Good", "Fair", "Poor"],
        required: true,
        sortOrder: 3,
      },
      { key: "pit_to_pit", type: "decimal", required: false, sortOrder: 4 },
      { key: "inseam", type: "decimal", required: false, sortOrder: 5 },
      { key: "color", type: "text", required: false, sortOrder: 6 },
    ],
  },
  {
    name: "Pokémon Sealed",
    description: "Sealed Pokémon products: booster boxes, ETBs, tins, blisters.",
    sortOrder: 1,
    attributes: [
      { key: "set", type: "text", required: true, sortOrder: 0 },
      {
        key: "product_type",
        type: "enum",
        enumOptions: [
          "Booster Box",
          "Elite Trainer Box",
          "Booster Bundle",
          "Tin",
          "Blister",
          "Collection Box",
          "Other",
        ],
        required: true,
        sortOrder: 1,
      },
      { key: "edition", type: "text", required: false, sortOrder: 2 },
    ],
  },
  {
    name: "Pokémon Single",
    description: "Individual Pokémon cards (raw and graded).",
    sortOrder: 2,
    attributes: [
      { key: "set", type: "text", required: true, sortOrder: 0 },
      { key: "card_number", type: "text", required: true, sortOrder: 1 },
      {
        key: "condition",
        type: "enum",
        enumOptions: ["NM", "LP", "MP", "HP", "DMG"],
        required: true,
        sortOrder: 2,
      },
      { key: "graded", type: "boolean", required: false, sortOrder: 3 },
      { key: "grade", type: "text", required: false, sortOrder: 4 },
    ],
  },
];

async function seedCategories(): Promise<void> {
  const db = getDb();

  for (const seed of SEED) {
    // ON CONFLICT DO NOTHING on the unique name index → idempotent.
    const [inserted] = await db
      .insert(categories)
      .values({
        name: seed.name,
        description: seed.description,
        sortOrder: seed.sortOrder,
      })
      .onConflictDoNothing({ target: categories.name })
      .returning({ id: categories.id });

    let categoryId: string;
    if (inserted !== undefined) {
      categoryId = inserted.id;
    } else {
      // Already existed — look it up.
      const existing = await db
        .select({ id: categories.id })
        .from(categories)
        .where(sql`${categories.name} = ${seed.name}`)
        .limit(1);
      if (existing[0] === undefined) {
        throw new Error(
          `Failed to find or create category "${seed.name}" — this should not happen.`,
        );
      }
      categoryId = existing[0].id;
    }

    for (const attr of seed.attributes) {
      await db
        .insert(attributeDefinitions)
        .values({
          categoryId,
          key: attr.key,
          type: attr.type,
          enumOptions: attr.enumOptions ?? null,
          required: attr.required ?? false,
          sortOrder: attr.sortOrder,
        })
        .onConflictDoNothing({
          target: [attributeDefinitions.categoryId, attributeDefinitions.key],
        });
    }

    console.warn(
      `Seeded category "${seed.name}" with ${String(seed.attributes.length)} attributes.`,
    );
  }
}

await seedCategories();
process.exit(0);
