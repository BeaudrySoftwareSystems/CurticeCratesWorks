/**
 * One-off seed script — populate existing items with both photos AND
 * product info sourced from public Poshmark listing pages. Useful for
 * dev / preview data without doing manual phone uploads + form entry.
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
 *   # Attach photos + product info from Poshmark listings to specific items
 *   bun run src/db/seed/photos-from-poshmark.ts \
 *     01HXXXXX...=https://poshmark.com/listing/abc123 \
 *     01HYYYYY...=https://poshmark.com/listing/def456
 *
 * Per listing the script:
 *   1. Extracts product info from the page's JSON-LD Product block
 *      (title, brand, color, listed price, description) plus the
 *      inline state blob (size). Maps schema.org item conditions to
 *      our Clothing condition enum.
 *   2. Merges those into the item's attributes (existing values are
 *      preserved unless the script has a fresh value for the same key)
 *      and writes listPrice via ItemRepository.update.
 *   3. Fetches up to MAX_PHOTOS_PER_ITEM photos, EXIF-strips and
 *      resizes them, uploads to Vercel Blob, writes photos rows.
 *
 * Re-running appends photo rows but the attribute merge is
 * idempotent — running twice doesn't multiply title/brand/etc.
 *
 * NOT production code. Lives under seed/ and excluded from coverage.
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
    await seedFromListing(pair, items, photos);
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

async function seedFromListing(
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

  let listing: Listing;
  try {
    listing = await fetchListing(pair.url);
  } catch (err) {
    console.warn(
      `  ! failed to fetch listing: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }

  // 1. Merge product info into the item.
  const mergedAttributes: Record<string, unknown> = {
    ...((item.attributes as Record<string, unknown>) ?? {}),
  };
  for (const [key, value] of Object.entries(listing.product)) {
    if (value !== undefined && value !== null && value !== "") {
      mergedAttributes[key] = value;
    }
  }
  const updatePatch: Parameters<ItemRepository["update"]>[1] = {
    attributes: mergedAttributes,
  };
  if (listing.listPrice !== null) {
    updatePatch.listPrice = listing.listPrice;
  }
  await items.update(pair.itemId, updatePatch);

  const productSummary = Object.entries(listing.product)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) =>
      `${k}=${typeof v === "string" && v.length > 40 ? `${v.slice(0, 40)}…` : String(v)}`,
    )
    .join(", ");
  console.warn(
    `  ✓ product info: ${productSummary || "(none extracted)"}${
      listing.listPrice !== null ? ` listPrice=$${listing.listPrice}` : ""
    }`,
  );

  // 2. Attach photos.
  if (listing.photoUrls.length === 0) {
    console.warn(`  ! no photo URLs found in the Poshmark page`);
    return;
  }
  console.warn(
    `  found ${listing.photoUrls.length} photo URL(s); attaching up to ${MAX_PHOTOS_PER_ITEM}`,
  );

  const toAttach = listing.photoUrls.slice(0, MAX_PHOTOS_PER_ITEM);
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
        access: "private",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      });
      const photo = await photos.create({
        itemId: pair.itemId,
        blobPath: written.pathname,
      });
      console.warn(
        `  ✓ photo ${i + 1}: ${photo.id}  ${written.pathname}  (${formatBytes(processed.length)})`,
      );
    } catch (err) {
      console.warn(
        `  ! failed photo ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await sleep(200);
  }
}

/**
 * Everything we extract from one Poshmark listing page in a single
 * fetch. Photos come from three fallback sources; product info comes
 * from the JSON-LD Product block (always present for SEO) plus a small
 * scrape of the inline state blob for size (which JSON-LD omits).
 */
interface Listing {
  photoUrls: string[];
  /** Listed price as a numeric string (no $), or null if not parseable. */
  listPrice: string | null;
  product: ProductAttributes;
}

/**
 * Attribute keys we know about from the v1 Clothing seed plus a few
 * generic ones (title, description) that fit any category. Anything not
 * in this set isn't extracted — the categories admin lets you add new
 * fields, but we don't try to auto-populate them from Poshmark since
 * the mapping isn't safe to guess.
 */
interface ProductAttributes {
  title?: string;
  description?: string;
  brand?: string;
  color?: string;
  size?: string;
  /** Mapped from schema.org itemCondition to the Clothing condition enum. */
  condition?: "NWT" | "NWOT" | "Excellent" | "Good" | "Fair" | "Poor";
}

async function fetchListing(pageUrl: string): Promise<Listing> {
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

  return {
    photoUrls: extractPhotoUrls(html),
    ...extractProduct(html),
  };
}

function extractPhotoUrls(html: string): string[] {
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
  for (const node of jsonLdNodes(html)) {
    const img = (node as { image?: unknown }).image;
    if (typeof img === "string") {
      found.push(img);
    } else if (Array.isArray(img)) {
      for (const u of img) {
        if (typeof u === "string") found.push(u);
      }
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

function extractProduct(html: string): {
  product: ProductAttributes;
  listPrice: string | null;
} {
  const product: ProductAttributes = {};
  let listPrice: string | null = null;

  // The Product node carries name / description / color / brand /
  // offers.price / offers.itemCondition. There may be additional
  // BreadcrumbList nodes — we ignore those.
  for (const node of jsonLdNodes(html)) {
    if ((node as { "@type"?: unknown })["@type"] !== "Product") continue;
    const p = node as Record<string, unknown>;
    if (typeof p["name"] === "string") {
      product.title = decodeHtmlEntities(p["name"]);
    }
    if (typeof p["description"] === "string") {
      product.description = decodeHtmlEntities(p["description"]);
    }
    if (typeof p["color"] === "string") {
      product.color = decodeHtmlEntities(p["color"]);
    }
    const brand = p["brand"];
    if (
      typeof brand === "object" &&
      brand !== null &&
      typeof (brand as { name?: unknown }).name === "string"
    ) {
      product.brand = decodeHtmlEntities((brand as { name: string }).name);
    }
    const offers = p["offers"];
    if (typeof offers === "object" && offers !== null) {
      const off = offers as Record<string, unknown>;
      if (typeof off["price"] === "string" || typeof off["price"] === "number") {
        const n = Number(off["price"]);
        if (!Number.isNaN(n)) {
          listPrice = n.toFixed(2);
        }
      }
      if (typeof off["itemCondition"] === "string") {
        const mapped = mapItemCondition(off["itemCondition"]);
        if (mapped !== undefined) {
          product.condition = mapped;
        }
      }
    }
  }

  // Size lives in the inline app state — JSON-LD doesn't carry it. Match
  // the `"size_quantities":[{...,"size_obj":{...,"display":"S",...}` shape.
  const sizeMatch = html.match(
    /"size_quantities":\[\{[^\]]*?"size_obj":\{[^}]*?"display":"([^"]+)"/,
  );
  if (sizeMatch?.[1] !== undefined) {
    product.size = sizeMatch[1];
  }

  return { product, listPrice };
}

function* jsonLdNodes(html: string): Generator<unknown> {
  const ldMatches = html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of ldMatches) {
    const raw = m[1];
    if (raw === undefined) continue;
    try {
      const data = JSON.parse(raw);
      const stack = Array.isArray(data) ? data : [data];
      for (const node of stack) {
        if (typeof node === "object" && node !== null) {
          yield node;
        }
      }
    } catch {
      // tolerate JSON-LD blocks that aren't valid JSON
    }
  }
}

/**
 * Map schema.org itemCondition URLs to the Clothing condition enum.
 * Defaults to undefined for anything ambiguous so we don't write a
 * wrong value over a real one.
 */
function mapItemCondition(
  schemaCondition: string,
): ProductAttributes["condition"] | undefined {
  if (schemaCondition.endsWith("NewCondition")) return "NWT";
  if (schemaCondition.endsWith("RefurbishedCondition")) return "Excellent";
  if (schemaCondition.endsWith("UsedCondition")) return "Good";
  if (schemaCondition.endsWith("DamagedCondition")) return "Poor";
  return undefined;
}

/**
 * Poshmark JSON-LD descriptions occasionally contain HTML-encoded
 * entities (e.g. `&quot;`, `&lt;`). Decoded for human readability in
 * attribute values.
 */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
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
