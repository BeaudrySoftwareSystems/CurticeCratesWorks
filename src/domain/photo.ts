/**
 * Photo domain types + upload-time invariants.
 *
 * v1 stores a single photo variant per row. The DB stores the raw blob
 * pathname; the Gateway composes public URLs from that pathname plus the
 * `BLOB_STORE_BASE_URL` env var. The "unguessable suffix" applied at upload
 * time (via `addRandomSuffix: true`) is the public-bearer token; the auth
 * gate around catalog pages is the access control.
 */
import type { Photo as DbPhoto, NewPhoto as DbNewPhoto } from "@/db/schema";

export type Photo = DbPhoto;
export type NewPhoto = DbNewPhoto;

/**
 * MIME types accepted on upload. Anything outside this list is rejected by
 * `onBeforeGenerateToken` (declared MIME) and again by the Gateway after
 * processing (magic-byte sniff). HEIC and AVIF are deferred — the JADENS
 * label printer's preview path was only verified for JPEG/PNG/WebP.
 */
export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const satisfies readonly string[];

export type PhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

export function isAllowedPhotoMime(mime: string): mime is PhotoMimeType {
  return (ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Hard upload size cap. Phone photos rarely exceed this after EXIF strip;
 * the cap exists primarily to bound `sharp` working-set memory.
 */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Resize ceiling for the persisted variant. Catalog cards size with CSS;
 * 2048px is the upper bound where label-printer previews still look sharp.
 */
export const MAX_PHOTO_DIMENSION = 2048;
