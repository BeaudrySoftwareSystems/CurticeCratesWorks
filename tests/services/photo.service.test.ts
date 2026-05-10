// @vitest-environment node
import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import type { Item } from "@/db/schema";
import {
  ErrInvalidUpload,
  ErrNotFound,
  ErrUnauthenticated,
  ErrValidation,
} from "@/domain/errors";
import type { Photo, PhotoMimeType } from "@/domain/photo";
import { PhotoService } from "@/services/photo.service";

const silentLogger = pino({ level: "silent" });

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: overrides.id ?? "item-1",
    displayId: overrides.displayId ?? 1,
    categoryId: overrides.categoryId ?? "cat-1",
    attributes: overrides.attributes ?? {},
    cost: overrides.cost ?? null,
    listPrice: overrides.listPrice ?? null,
    location: overrides.location ?? null,
    status: overrides.status ?? "stocked",
    intakeSkipped: overrides.intakeSkipped ?? false,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

function makeService(opts: {
  item?: Item | null;
  processSucceeds?: boolean;
  processError?: Error;
} = {}): {
  svc: PhotoService;
  inserts: Array<{ itemId: string; blobPath: string }>;
  processCalls: Array<{ pathname: string; mime: string }>;
  deleteCalls: string[];
} {
  const inserts: Array<{ itemId: string; blobPath: string }> = [];
  const processCalls: Array<{ pathname: string; mime: string }> = [];
  const deleteCalls: string[] = [];

  const photos = {
    async create(input: { itemId: string; blobPath: string }): Promise<Photo> {
      inserts.push(input);
      return {
        id: `photo-${inserts.length}`,
        itemId: input.itemId,
        blobPath: input.blobPath,
        sortOrder: 0,
        caption: null,
        createdAt: new Date(),
      };
    },
  };

  const items = {
    async findById(id: string): Promise<Item | null> {
      if (opts.item === undefined) {
        return makeItem({ id });
      }
      return opts.item;
    },
  };

  const blob = {
    async processUploadedBlob(
      pathname: string,
      mime: string,
    ): Promise<{ blobPathname: string; contentType: PhotoMimeType }> {
      processCalls.push({ pathname, mime });
      if (opts.processError !== undefined) {
        throw opts.processError;
      }
      if (opts.processSucceeds === false) {
        throw new ErrInvalidUpload(pathname, "test");
      }
      return {
        blobPathname: `processed/${pathname}-suffixed`,
        contentType: mime as PhotoMimeType,
      };
    },
    async deletePhoto(pathname: string): Promise<void> {
      deleteCalls.push(pathname);
    },
  };

  return {
    svc: new PhotoService(photos, items, blob, silentLogger),
    inserts,
    processCalls,
    deleteCalls,
  };
}

describe("PhotoService.validateUploadRequest", () => {
  it("throws ErrUnauthenticated when no session is present", async () => {
    const { svc } = makeService();
    await expect(
      svc.validateUploadRequest(null, {
        itemId: "item-1",
        declaredMime: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrUnauthenticated);
  });

  it("throws ErrValidation when the declared mime is not in the allowlist", async () => {
    const { svc } = makeService();
    await expect(
      svc.validateUploadRequest("staff@example.com", {
        itemId: "item-1",
        declaredMime: "image/svg+xml",
      }),
    ).rejects.toBeInstanceOf(ErrValidation);
  });

  it("throws ErrValidation when the declared size exceeds the cap", async () => {
    const { svc } = makeService();
    await expect(
      svc.validateUploadRequest("staff@example.com", {
        itemId: "item-1",
        declaredMime: "image/png",
        declaredBytes: 50 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(ErrValidation);
  });

  it("throws ErrNotFound when the target item does not exist", async () => {
    const { svc } = makeService({ item: null });
    await expect(
      svc.validateUploadRequest("staff@example.com", {
        itemId: "missing",
        declaredMime: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrNotFound);
  });

  it("throws ErrValidation when the item is sold or archived", async () => {
    const { svc } = makeService({ item: makeItem({ status: "sold" }) });
    await expect(
      svc.validateUploadRequest("staff@example.com", {
        itemId: "item-1",
        declaredMime: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrValidation);
  });

  it("returns a server-issued pathname under the per-item prefix on success", async () => {
    const { svc } = makeService();
    const auth = await svc.validateUploadRequest("staff@example.com", {
      itemId: "item-1",
      declaredMime: "image/jpeg",
    });
    expect(auth.pathname).toMatch(/^items\/item-1\/upload-\d+$/);
    expect(auth.allowedContentTypes).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(auth.maximumSizeInBytes).toBe(10 * 1024 * 1024);
    expect(JSON.parse(auth.tokenPayload)).toEqual({
      itemId: "item-1",
      declaredMime: "image/jpeg",
    });
  });
});

describe("PhotoService.completeUpload", () => {
  it("processes the blob and writes a row on the happy path", async () => {
    const { svc, inserts, processCalls } = makeService();
    const photo = await svc.completeUpload("items/item-1/upload-123", {
      itemId: "item-1",
      declaredMime: "image/png",
    });
    expect(photo.itemId).toBe("item-1");
    expect(photo.blobPath).toBe(
      "processed/items/item-1/upload-123-suffixed",
    );
    expect(processCalls).toEqual([
      { pathname: "items/item-1/upload-123", mime: "image/png" },
    ]);
    expect(inserts).toHaveLength(1);
  });

  it("does NOT insert a row when the gateway throws", async () => {
    const { svc, inserts } = makeService({ processSucceeds: false });
    await expect(
      svc.completeUpload("items/item-1/upload-x", {
        itemId: "item-1",
        declaredMime: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrInvalidUpload);
    expect(inserts).toHaveLength(0);
  });

  it("wraps non-ErrInvalidUpload gateway failures as ErrInvalidUpload", async () => {
    const { svc, inserts } = makeService({
      processError: new Error("network timeout"),
    });
    await expect(
      svc.completeUpload("items/item-1/upload-x", {
        itemId: "item-1",
        declaredMime: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrInvalidUpload);
    expect(inserts).toHaveLength(0);
  });

  it("cleans up the original blob and throws when the item disappeared", async () => {
    const { svc, deleteCalls, processCalls, inserts } = makeService({
      item: null,
    });
    await expect(
      svc.completeUpload("items/missing/upload-x", {
        itemId: "missing",
        declaredMime: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrNotFound);

    expect(processCalls).toHaveLength(0);
    expect(inserts).toHaveLength(0);
    expect(deleteCalls).toEqual(["items/missing/upload-x"]);
  });

  it("logs a warning before re-throwing on processing failure", async () => {
    const warn = vi.fn();
    const photos = {
      async create(): Promise<Photo> {
        throw new Error("should not be called");
      },
    };
    const items = {
      async findById(id: string): Promise<Item | null> {
        return makeItem({ id });
      },
    };
    const blob = {
      async processUploadedBlob(): Promise<{
        blobPathname: string;
        contentType: PhotoMimeType;
      }> {
        throw new ErrInvalidUpload("p", "magic-byte mismatch");
      },
      async deletePhoto(): Promise<void> {
        // unused
      },
    };
    const svc = new PhotoService(photos, items, blob, {
      ...silentLogger,
      warn,
    } as unknown as typeof silentLogger);
    await expect(
      svc.completeUpload("p", { itemId: "item-1", declaredMime: "image/png" }),
    ).rejects.toBeInstanceOf(ErrInvalidUpload);
    expect(warn).toHaveBeenCalledOnce();
  });
});
