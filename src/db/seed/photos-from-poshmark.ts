/**
 * One-off seed script — attach photos to existing items by sourcing them
 * from public Poshmark listing pages. Useful for populating dev / preview
 * databases with realistic data without doing manual phone uploads.
 *
 * Requirements:
 *   - DATABASE_URL must point at the target database (the same one the
 *     app connects to)
 *   - BLOB_READ_WRITE_TOKEN must be set so @vercel/blob can `put()`
 *
 * Usage:
 *   # List current items + show usage
 *   bun run src/db/seed/photos-from-poshmark.ts
 *
 *   # Attach photos from one or more Poshmark listings to specific items
 *   bun run src/db/seed/photos-from-poshmark.ts \
 *     01HXXXXX...=https://poshmark.com/listing/abc123 \
 *     01HYYYYY...=https://poshmark.com/listing/def456
 *
 * Per listing the script fetches up to MAX_PHOTOS_PER_ITEM photos, EXIF-
 * strips and resizes them, uploads to Vercel Blob, and writes photos
 * rows linked to the item. Re-running with the same arguments creates
 * additional photos rows (the script does not dedupe — it appends).
 *
 * NOT production code. Scoped to the seed/ directory and excluded from
 * coverage.
 */

import { put } from "@vercel/blob";
import sharp from "sharp";
import { getDb } from "@/db/client";
import { ItemRepository } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";

const MAX_PHOTOS_PER_ITEM = 5;
const MAX_DIMENSION = 2048;
const FETCH_DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

interface Pair {
  itemId: string;
  url: string;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const db = getDb();
  const items = new ItemRepository(db);
  const photos = new PhotoRepository(db);

  if (argv.length === 0) {
    await listItems(items);
    return;
  }

  const pairs = argv.map(parseArg);
  for (const pair of pairs) {
    await attachPhotos(pair, items, photos);
    await sleep(FETCH_DELAY_MS);
  }
}

async function listItems(items: ItemRepository): Promise<void> {
  const all = await items.listAll();
  if (all.length === 0) {
    console.warn("No items in the database yet.");
    console.warn(
      "Run an intake first via the warehouse UI, then re-run this script with itemId=url pairs.",
    );
    return;
  }
  console.warn(`Items in inventory (${all.length}):\n`);
  for (const item of all) {
    const padded = String(item.displayId).padStart(6, "0");
    const title =
      typeof (item.attributes as Record<string, unknown>)["title"] === "string"
        ? ((item.attributes as Record<string, string>)["title"] ?? "")
        : "";
    console.warn(`  ${item.id}  CCI-${padded}  status=${item.status}  ${title}`);
  }
  console.warn("\nUsage:");
  console.warn(
    `  bun run src/db/seed/photos-from-poshmark.ts <itemId>=<poshmarkUrl> [...]`,
  );
}

function parseArg(arg: string): Pair {
  const eq = arg.indexOf("=");
  if (eq === -1) {
    throw new Error(
      `Bad argument "${arg}" — expected the form itemId=https://poshmark.com/listing/...`,
    );
  }
  const itemId = arg.slice(0, eq).trim();
  const url = arg.slice(eq + 1).trim();
  if (itemId === "" || url === "") {
    throw new Error(`Bad argument "${arg}" — itemId and url are both required`);
  }
  return { itemId, url };
}

async function attachPhotos(
  pair: Pair,
  items: ItemRepository,
  photos: PhotoRepository,
): Promise<void> {
  const item = await items.findById(pair.itemId);
  if (item === null) {
    console.warn(`! item ${pair.itemId} not found — skipping`);
    return;
  }

  console.warn(`\n→ ${pair.itemId}  CCI-${String(item.displayId).padStart(6, "0")}`);
  console.warn(`  source: ${pair.url}`);

  const photoUrls = await fetchPhotoUrls(pair.url);
  if (photoUrls.length === 0) {
    console.warn(`  ! no photo URLs found in the Poshmark page`);
    return;
  }
  console.warn(`  found ${photoUrls.length} photo URL(s); attaching up to ${MAX_PHOTOS_PER_ITEM}`);

  const toAttach = photoUrls.slice(0, MAX_PHOTOS_PER_ITEM);
  for (let i = 0; i < toAttach.length; i++) {
    const photoUrl = toAttach[i]!;
    try {
      const original = await downloadImage(photoUrl);
      const processed = await sharp(original)
        .rotate()
        .resize({ width: MAX_DIMENSION, withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer();

      const pathname = `items/${pair.itemId}/poshmark-${Date.now()}-${i}.jpg`;
      const written = await put(pathname, processed, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      });
      const photo = await photos.create({
        itemId: pair.itemId,
        blobPath: written.pathname,
      });
      console.warn(`  ✓ ${photo.id}  ${written.pathname}  (${formatBytes(processed.length)})`);
    } catch (err) {
      console.warn(
        `  ! failed photo ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await sleep(200);
  }
}

/**
 * Extract photo URLs from a Poshmark listing page. Tries three sources
 * in order:
 *   1. og:image meta tag (always present for SEO; gives the cover only)
 *   2. JSON-LD `image` array (sometimes carries multiple)
 *   3. Direct <img> tags pointing at Poshmark's CDN hosts
 *
 * Returns the deduplicated set ordered cover-first.
 */
async function fetchPhotoUrls(pageUrl: string): Promise<string[]> {
  const res = await fetch(pageUrl, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`fetch ${pageUrl} → HTTP ${res.status}`);
  }
  const html = await res.text();

  const found: string[] = [];

  // 1. og:image (cover)
  const ogMatches = html.matchAll(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
  );
  for (const m of ogMatches) {
    const u = m[1];
    if (u !== undefined) found.push(u);
  }

  // 2. JSON-LD images
  const ldMatches = html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of ldMatches) {
    const raw = m[1];
    if (raw === undefined) continue;
    try {
      const data = JSON.parse(raw) as
        | { image?: string | string[] }
        | { image?: string | string[] }[];
      const stack = Array.isArray(data) ? data : [data];
      for (const node of stack) {
        if (typeof node !== "object" || node === null) continue;
        const img = (node as { image?: unknown }).image;
        if (typeof img === "string") {
          found.push(img);
        } else if (Array.isArray(img)) {
          for (const u of img) {
            if (typeof u === "string") found.push(u);
          }
        }
      }
    } catch {
      // tolerate JSON-LD blocks that aren't valid JSON
    }
  }

  // 3. Direct URL pattern match. Poshmark listing photos live at
  //      https://<shard>.cloudfront.net/posts/<yyyy>/<mm>/<dd>/<id>/[sml]_<id>.jpg
  //    The shard subdomain varies per closet (`di2ponv0v5otw`,
  //    `di2ponv5tjbd64`, etc.), so match by path shape and extension
  //    rather than exact host. The `posts/` segment is distinctive
  //    enough to avoid false-positives against webpack chunks etc.
  const cdnMatches = html.matchAll(
    /https:\/\/[a-z0-9-]+\.cloudfront\.net\/posts\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]+\/[smlu]_[a-f0-9]+\.(?:jpg|jpeg|png|webp)/gi,
  );
  for (const m of cdnMatches) {
    found.push(m[0]);
  }

  // Dedupe, preserving cover order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of found) {
    const normalized = normalizeUrl(u);
    if (normalized === null || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/**
 * Strip Poshmark's per-size suffix so different thumbnails of the same
 * photo dedupe. Poshmark URLs look like:
 *   https://di2ponv5tjbd64.cloudfront.net/files/.../s_<id>.jpg
 *   https://di2ponv5tjbd64.cloudfront.net/files/.../m_<id>.jpg
 *   https://di2ponv5tjbd64.cloudfront.net/files/.../l_<id>.jpg
 * The leading letter (s/m/l) is the size variant. We rewrite to "l_"
 * so we always grab the largest.
 */
function normalizeUrl(u: string): string | null {
  if (!u.startsWith("http")) return null;
  return u.replace(/\/(s|m|l)_([^/]+)$/i, "/l_$2");
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`download ${url} → HTTP ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

await main();
process.exit(0);
