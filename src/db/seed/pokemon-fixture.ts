/**
 * One-off fixture script — populate an existing item with a realistic
 * Pokémon Sealed payload (Scarlet & Violet 151 Elite Trainer Box, the
 * most heavily-scalped sealed product of the recent era), and
 * optionally attach a photo from any image URL you supply.
 *
 * Usage:
 *   bun run src/db/seed/pokemon-fixture.ts <itemId>
 *   bun run src/db/seed/pokemon-fixture.ts <itemId> <imageUrl>
 *
 * The second arg is any web-accessible JPEG/PNG/WebP. Easiest sources:
 *   - https://www.tcgplayer.com/search/pokemon/scarlet-and-violet-151
 *     pick a Sealed Products listing, right-click the image, copy URL
 *   - https://www.ebay.com/sch/i.html?_nkw=pokemon+151+elite+trainer+box
 *     same pattern
 *
 * The script downloads, runs through sharp (rotate + resize 2048 +
 * jpeg 88), uploads via @vercel/blob put with addRandomSuffix:true,
 * and writes a photos row linked to the item.
 *
 * Requires DATABASE_URL. With an image URL also requires
 * BLOB_READ_WRITE_TOKEN. Bypasses CategoryService.validateIntake on
 * purpose — this is fixture data. Existing attributes are merged so
 * re-running preserves anything you added by hand.
 */

import { put } from "@vercel/blob";
import sharp from "sharp";
import { getDb } from "@/db/client";
import { ItemRepository } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";

const POKEMON_151_ETB = {
  set: "Scarlet & Violet 151",
  product_type: "Elite Trainer Box",
  edition: "First print",
  title: "Pokémon TCG · Scarlet & Violet 151 Elite Trainer Box",
} as const;

const COST = "54.99"; // approx MSRP at release
const LIST_PRICE = "119.99"; // typical scalper resale band a year out
const LOCATION = "B2, top shelf";

const MAX_DIMENSION = 2048;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

async function main(): Promise<void> {
  const itemId = process.argv[2];
  const imageUrl = process.argv[3];

  if (itemId === undefined || itemId === "") {
    console.warn(
      "Usage: bun run src/db/seed/pokemon-fixture.ts <itemId> [imageUrl]",
    );
    process.exit(1);
  }

  const db = getDb();
  const items = new ItemRepository(db);
  const photos = new PhotoRepository(db);

  const item = await items.findById(itemId);
  if (item === null) {
    console.warn(`! item ${itemId} not found`);
    process.exit(1);
  }

  // 1. Merge attributes + listPrice + cost + location.
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

  // 2. Optional photo upload.
  if (imageUrl === undefined || imageUrl === "") {
    console.warn("\nNo image URL supplied — skipping photo.");
    console.warn(
      "Tip: re-run with `bun run db:seed:pokemon <itemId> <imageUrl>` to attach a photo.",
    );
    return;
  }

  console.warn(`\n→ attaching photo from ${imageUrl}`);
  try {
    const original = await downloadImage(imageUrl);
    const processed = await sharp(original)
      .rotate()
      .resize({ width: MAX_DIMENSION, withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();

    const pathname = `items/${itemId}/pokemon-${Date.now()}.jpg`;
    const written = await put(pathname, processed, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });
    const photo = await photos.create({
      itemId,
      blobPath: written.pathname,
    });
    console.warn(
      `  ✓ ${photo.id}  ${written.pathname}  (${formatBytes(processed.length)})`,
    );
  } catch (err) {
    console.warn(
      `  ! photo failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`download ${url} → HTTP ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

await main();
process.exit(0);
