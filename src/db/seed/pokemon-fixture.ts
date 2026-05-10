/**
 * One-off fixture script — populate an existing item with a realistic
 * Pokémon Sealed payload (Scarlet & Violet 151 Elite Trainer Box, the
 * most heavily-scalped sealed product of the recent era).
 *
 * Usage:
 *   bun run src/db/seed/pokemon-fixture.ts <itemId>
 *
 * Requires DATABASE_URL. Bypasses CategoryService.validateIntake on
 * purpose — this is fixture data, not a real intake. Existing
 * attributes are merged so re-running won't blow away anything you
 * later added by hand.
 */

import { getDb } from "@/db/client";
import { ItemRepository } from "@/repositories/item.repository";

const POKEMON_151_ETB = {
  set: "Scarlet & Violet 151",
  product_type: "Elite Trainer Box",
  edition: "First print",
  title: "Pokémon TCG · Scarlet & Violet 151 Elite Trainer Box",
} as const;

const COST = "54.99"; // approx MSRP at release
const LIST_PRICE = "119.99"; // typical scalper resale band a year out
const LOCATION = "B2, top shelf";

async function main(): Promise<void> {
  const itemId = process.argv[2];
  if (itemId === undefined || itemId === "") {
    console.warn("Usage: bun run src/db/seed/pokemon-fixture.ts <itemId>");
    process.exit(1);
  }

  const db = getDb();
  const items = new ItemRepository(db);

  const item = await items.findById(itemId);
  if (item === null) {
    console.warn(`! item ${itemId} not found`);
    process.exit(1);
  }

  const merged = {
    ...((item.attributes as Record<string, unknown>) ?? {}),
    ...POKEMON_151_ETB,
  };

  const updated = await items.update(itemId, {
    attributes: merged,
    cost: COST,
    listPrice: LIST_PRICE,
    location: LOCATION,
  });

  if (updated === null) {
    console.warn(`! update failed for ${itemId}`);
    process.exit(1);
  }

  console.warn(`✓ ${itemId}  CCI-${String(item.displayId).padStart(6, "0")}`);
  console.warn(`  set:           ${POKEMON_151_ETB.set}`);
  console.warn(`  product_type:  ${POKEMON_151_ETB.product_type}`);
  console.warn(`  edition:       ${POKEMON_151_ETB.edition}`);
  console.warn(`  cost:          $${COST}`);
  console.warn(`  list price:    $${LIST_PRICE}`);
  console.warn(`  location:      ${LOCATION}`);
}

await main();
process.exit(0);
