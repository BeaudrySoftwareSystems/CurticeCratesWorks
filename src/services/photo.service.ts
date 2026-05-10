import type { Logger } from "pino";
import type { Item } from "@/db/schema";
import {
  ErrInvalidUpload,
  ErrNotFound,
  ErrUnauthenticated,
  ErrValidation,
} from "@/domain/errors";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  isAllowedPhotoMime,
  MAX_PHOTO_BYTES,
  type Photo,
  type PhotoMimeType,
} from "@/domain/photo";

/**
 * Repository capabilities the service depends on. Defined here per ISP —
 * the concrete `PhotoRepository` and `ItemRepository` classes structurally
 * satisfy these without an explicit `implements`.
 */
export interface PhotoWriter {
  create(input: { itemId: string; blobPath: string }): Promise<Photo>;
}

export interface ItemReader {
  findById(id: string): Promise<Item | null>;
}

export interface BlobProcessor {
  processUploadedBlob(
    pathname: string,
    declaredMime: string,
  ): Promise<{ blobPathname: string; contentType: PhotoMimeType }>;
  deletePhoto(pathname: string): Promise<void>;
}

export interface SessionReader {
  /** Returns the authenticated user's email, or null if not signed in. */
  (): Promise<string | null>;
}

/**
 * The result of `validateUploadRequest` — fed into Vercel Blob's
 * `onBeforeGenerateToken` to shape the client token. The pathname is
 * server-issued so the client can never inject path traversals or write
 * outside the per-item prefix.
 */
export interface UploadAuthorization {
  pathname: string;
  allowedContentTypes: readonly PhotoMimeType[];
  maximumSizeInBytes: number;
  tokenPayload: string;
}

export interface UploadRequest {
  itemId: string;
  declaredMime: string;
  declaredBytes?: number;
}

/**
 * Owns the photo-upload lifecycle: pre-upload authorization (which gets
 * called by Vercel Blob's `onBeforeGenerateToken`) and post-upload
 * processing (called by `onUploadCompleted`).
 *
 * Auth + ownership live here, not in the route handler — the route is a
 * thin adapter that passes session + clientPayload into the service and
 * surfaces the resulting domain errors. Tests cover every error branch
 * with fakes; the route handler itself is verified by integration.
 */
export class PhotoService {
  constructor(
    private readonly photos: PhotoWriter,
    private readonly items: ItemReader,
    private readonly blob: BlobProcessor,
    private readonly logger: Logger,
  ) {}

  async validateUploadRequest(
    sessionEmail: string | null,
    req: UploadRequest,
  ): Promise<UploadAuthorization> {
    if (sessionEmail === null) {
      throw new ErrUnauthenticated();
    }

    if (!isAllowedPhotoMime(req.declaredMime)) {
      throw new ErrValidation([
        `mime: ${req.declaredMime} not in [${ALLOWED_PHOTO_MIME_TYPES.join(", ")}]`,
      ]);
    }

    if (
      req.declaredBytes !== undefined &&
      req.declaredBytes > MAX_PHOTO_BYTES
    ) {
      throw new ErrValidation([
        `bytes: declared ${req.declaredBytes} exceeds cap ${MAX_PHOTO_BYTES}`,
      ]);
    }

    const item = await this.items.findById(req.itemId);
    if (item === null) {
      throw new ErrNotFound("item", req.itemId);
    }
    if (item.status !== "stocked") {
      throw new ErrValidation([
        `item: ${req.itemId} has status ${item.status}; only stocked items accept new photos`,
      ]);
    }

    const pathname = `items/${req.itemId}/upload-${Date.now()}`;
    return {
      pathname,
      allowedContentTypes: ALLOWED_PHOTO_MIME_TYPES,
      maximumSizeInBytes: MAX_PHOTO_BYTES,
      tokenPayload: JSON.stringify({
        itemId: req.itemId,
        declaredMime: req.declaredMime,
      }),
    };
  }

  async completeUpload(
    originalPathname: string,
    payload: { itemId: string; declaredMime: string },
  ): Promise<Photo> {
    const item = await this.items.findById(payload.itemId);
    if (item === null) {
      // The token was valid when issued but the item disappeared mid-upload.
      // Clean up the orphaned blob so we never accumulate storage debt.
      await this.blob.deletePhoto(originalPathname).catch(() => undefined);
      throw new ErrNotFound("item", payload.itemId);
    }

    let processed: { blobPathname: string };
    try {
      processed = await this.blob.processUploadedBlob(
        originalPathname,
        payload.declaredMime,
      );
    } catch (err) {
      this.logger.warn(
        {
          event: "photo.processFailed",
          itemId: payload.itemId,
          pathname: originalPathname,
          err,
        },
        "photo upload failed processing",
      );
      throw err instanceof ErrInvalidUpload
        ? err
        : new ErrInvalidUpload(originalPathname, "processing failed");
    }

    const photo = await this.photos.create({
      itemId: payload.itemId,
      blobPath: processed.blobPathname,
    });

    this.logger.info(
      {
        event: "photo.created",
        photoId: photo.id,
        itemId: photo.itemId,
        pathname: processed.blobPathname,
      },
      "photo created",
    );

    return photo;
  }
}
