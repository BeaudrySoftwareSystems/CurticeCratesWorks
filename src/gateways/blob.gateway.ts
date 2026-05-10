import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { del, get, put } from "@vercel/blob";
import { ErrInvalidUpload } from "@/domain/errors";
import {
  isAllowedPhotoMime,
  MAX_PHOTO_DIMENSION,
  type PhotoMimeType,
} from "@/domain/photo";

/**
 * Subset of the @vercel/blob surface this gateway depends on. Defining the
 * port at the consumer (CLAUDE.md, ISP) keeps the unit tests trivial — the
 * test harness passes mocks instead of touching the real SDK or network.
 */
export interface BlobClient {
  get: typeof get;
  put: typeof put;
  del: typeof del;
}

/**
 * Subset of `sharp` the processor uses. Same rationale as `BlobClient` —
 * lets us swap a fake in tests without booting the native binary.
 *
 * sharp strips all metadata (EXIF, IPTC, XMP, ICC) on `toBuffer()` by
 * default in 0.34 — see https://sharp.pixelplumbing.com/api-output. We
 * explicitly do NOT call `withMetadata()`, which would re-attach it.
 */
export type SharpFactory = (input: Buffer) => SharpPipeline;
export interface SharpPipeline {
  rotate(): SharpPipeline;
  resize(opts: { width: number; withoutEnlargement: boolean }): SharpPipeline;
  toBuffer(): Promise<Buffer>;
}

export interface ProcessedPhoto {
  blobPathname: string;
  contentType: PhotoMimeType;
  bytes: number;
}

/**
 * Owns every interaction with Vercel Blob. The Service layer never imports
 * `@vercel/blob` directly — this is the single seam where vendor responses
 * are normalized into Domain types and where failure modes are mapped to
 * `ErrInvalidUpload`.
 *
 * The "happy path" flow:
 *   1. Client uploads original via `handleUpload` (auth'd in the route).
 *   2. `processUploadedBlob` fetches the original, sniffs magic bytes,
 *      EXIF-strips + rotates + resizes via `sharp`, writes the processed
 *      variant back to Blob with `addRandomSuffix: true`, and removes the
 *      original. Returns the new pathname.
 *   3. Service writes the processed pathname to the photos table.
 *
 * Any failure in step 2 → the original is removed and `ErrInvalidUpload` is
 * thrown. We never persist a row that points at a non-existent or invalid
 * blob.
 */
export class BlobGateway {
  constructor(
    private readonly blob: BlobClient,
    private readonly sharpFactory: SharpFactory = (buf) => sharp(buf),
    private readonly storeBaseUrl: string = process.env["BLOB_STORE_BASE_URL"] ??
      "",
  ) {}

  async processUploadedBlob(
    originalPathname: string,
    declaredMime: string,
  ): Promise<ProcessedPhoto> {
    if (!isAllowedPhotoMime(declaredMime)) {
      await this.safeDelete(originalPathname);
      throw new ErrInvalidUpload(
        originalPathname,
        `declared mime ${declaredMime} not in allowlist`,
      );
    }

    const fetched = await this.blob.get(originalPathname, { access: "public" });
    if (fetched === null || fetched === undefined || fetched.stream === null) {
      throw new ErrInvalidUpload(originalPathname, "blob not found");
    }
    const original = await streamToBuffer(fetched.stream);

    const sniffed = await fileTypeFromBuffer(original);
    if (sniffed === undefined || sniffed.mime !== declaredMime) {
      await this.safeDelete(originalPathname);
      throw new ErrInvalidUpload(
        originalPathname,
        `magic bytes (${sniffed?.mime ?? "unknown"}) do not match declared mime (${declaredMime})`,
      );
    }

    let processed: Buffer;
    try {
      processed = await this.sharpFactory(original)
        .rotate()
        .resize({
          width: MAX_PHOTO_DIMENSION,
          withoutEnlargement: true,
        })
        .toBuffer();
    } catch (err) {
      await this.safeDelete(originalPathname);
      throw new ErrInvalidUpload(
        originalPathname,
        `image decode failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const processedPathname = derivedProcessedPath(originalPathname);
    const written = await this.blob.put(processedPathname, processed, {
      access: "public",
      contentType: declaredMime,
      addRandomSuffix: true,
    });

    await this.safeDelete(originalPathname);

    return {
      blobPathname: written.pathname,
      contentType: declaredMime,
      bytes: processed.length,
    };
  }

  async deletePhoto(pathname: string): Promise<void> {
    await this.blob.del(pathname);
  }

  /**
   * Compose the public URL for a stored pathname. With `access: 'public'`
   * + `addRandomSuffix: true`, the resulting URL is unguessable but
   * permanent — no per-render RTT, no signing. Auth on the catalog
   * pages is the actual access control.
   *
   * Returns null when `BLOB_STORE_BASE_URL` is not configured, so a
   * misconfigured environment surfaces as a "no photo" placeholder
   * rather than a 500-RSC error on the catalog. Boot-time logging
   * makes the cause obvious in function logs.
   */
  getPhotoUrl(pathname: string): string | null {
    if (this.storeBaseUrl === "") {
      return null;
    }
    // Tolerate `BLOB_STORE_BASE_URL="https://..."` with literal quotes
    // around the value — some shells / dashboard inputs don't strip them
    // and a stray quote at the host boundary 404s every photo.
    const base = this.storeBaseUrl
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/+$/, "");
    const path = pathname.replace(/^\/+/, "");
    return `${base}/${path}`;
  }

  /**
   * Bulk URL resolution. Symmetry with the catalog page's batched access
   * pattern; null-valued entries are dropped so callers can use the map
   * as "URL exists" presence info.
   */
  getPhotoUrls(pathnames: readonly string[]): Map<string, string> {
    const out = new Map<string, string>();
    for (const p of pathnames) {
      const url = this.getPhotoUrl(p);
      if (url !== null) {
        out.set(p, url);
      }
    }
    return out;
  }

  private async safeDelete(pathname: string): Promise<void> {
    try {
      await this.blob.del(pathname);
    } catch {
      // Best-effort cleanup. The original error is what the caller surfaces.
    }
  }
}

/**
 * Build the pathname for the processed variant. We tag with `processed/`
 * to make it obvious in the Vercel Blob dashboard which objects came out
 * of the EXIF-strip pipeline vs raw uploads. `addRandomSuffix: true` on
 * the put still appends an unguessable token, so collisions can't happen.
 */
function derivedProcessedPath(originalPathname: string): string {
  const stripped = originalPathname.replace(/^\/+/, "");
  return `processed/${stripped}`;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value !== undefined) {
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}
