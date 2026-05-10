// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  BlobGateway,
  type BlobClient,
  type SharpFactory,
} from "@/gateways/blob.gateway";
import { ErrInvalidUpload } from "@/domain/errors";

/**
 * Build a real JPEG buffer with embedded EXIF so we can assert the
 * processor strips it. Using a real `sharp` here (not the test fake) keeps
 * the round-trip honest — `sharp` is the actual library that runs in prod.
 *
 * JPEG is the canonical EXIF carrier; PNG can store EXIF too but the
 * round-trip through libvips is less reliable on synthetic inputs.
 */
async function jpegBufferWithExif(): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 3, background: "#ff8800" },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: "Curtis Crates Test" } })
    .toBuffer();
}

function makeBufferStream(buf: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buf));
      controller.close();
    },
  });
}

interface FakeBlob {
  pathname: string;
  bytes: Buffer;
  contentType?: string;
}

function makeFakeBlobClient(seed: FakeBlob[] = []): {
  client: BlobClient;
  store: Map<string, FakeBlob>;
  putCalls: Array<{ pathname: string; opts: unknown }>;
  delCalls: string[];
} {
  const store = new Map<string, FakeBlob>();
  for (const b of seed) {
    store.set(b.pathname, b);
  }
  const putCalls: Array<{ pathname: string; opts: unknown }> = [];
  const delCalls: string[] = [];

  const client = {
    async get(urlOrPathname: string) {
      const found = store.get(urlOrPathname);
      if (found === undefined) {
        return null;
      }
      return {
        statusCode: 200,
        blob: {
          url: `https://example.public.blob.vercel-storage.com/${found.pathname}`,
          pathname: found.pathname,
          contentType: found.contentType ?? "application/octet-stream",
          contentDisposition: null,
          contentLength: found.bytes.length,
          access: "public" as const,
          uploadedAt: new Date().toISOString(),
          etag: "fake-etag",
        },
        stream: makeBufferStream(found.bytes),
      };
    },
    async put(pathname: string, body: Buffer, opts: unknown) {
      const finalPath = `${pathname}-suffixed`; // simulate addRandomSuffix
      store.set(finalPath, {
        pathname: finalPath,
        bytes: body,
        contentType: (opts as { contentType?: string }).contentType,
      });
      putCalls.push({ pathname: finalPath, opts });
      return {
        url: `https://example.public.blob.vercel-storage.com/${finalPath}`,
        pathname: finalPath,
        contentType:
          (opts as { contentType?: string }).contentType ??
          "application/octet-stream",
        contentDisposition: null,
        contentLength: body.length,
        access: "public" as const,
        uploadedAt: new Date().toISOString(),
        etag: "fake-etag-2",
      };
    },
    async del(urls: string | string[]) {
      const all = Array.isArray(urls) ? urls : [urls];
      for (const u of all) {
        store.delete(u);
        delCalls.push(u);
      }
    },
    // Intentionally cast: the surface we use is intersected via BlobClient,
    // and the @vercel/blob library's full types include overloads we don't.
  } as unknown as BlobClient;

  return { client, store, putCalls, delCalls };
}

describe("BlobGateway.processUploadedBlob", () => {
  let originalBytes: Buffer;

  beforeEach(async () => {
    originalBytes = await jpegBufferWithExif();
  });

  it("rejects an upload whose declared MIME is outside the allowlist", async () => {
    const { client, delCalls } = makeFakeBlobClient([
      { pathname: "uploads/bogus.svg", bytes: Buffer.from("<svg/>") },
    ]);
    const gw = new BlobGateway(client);

    await expect(
      gw.processUploadedBlob("uploads/bogus.svg", "image/svg+xml"),
    ).rejects.toBeInstanceOf(ErrInvalidUpload);

    expect(delCalls).toContain("uploads/bogus.svg");
  });

  it("rejects an upload whose magic bytes do not match the declared MIME", async () => {
    // Bytes are real JPEG; declared as image/png → magic-byte mismatch.
    const { client, delCalls } = makeFakeBlobClient([
      { pathname: "uploads/lying.png", bytes: originalBytes },
    ]);
    const gw = new BlobGateway(client);

    await expect(
      gw.processUploadedBlob("uploads/lying.png", "image/png"),
    ).rejects.toBeInstanceOf(ErrInvalidUpload);

    expect(delCalls).toContain("uploads/lying.png");
  });

  it("happy path: strips EXIF, writes processed variant, deletes original", async () => {
    // Sanity-check the input fixture really did embed EXIF — otherwise the
    // assertion below would pass for the wrong reason.
    const inputMeta = await sharp(originalBytes).metadata();
    expect(inputMeta.exif).toBeDefined();

    const { client, store, putCalls, delCalls } = makeFakeBlobClient([
      { pathname: "uploads/photo.jpg", bytes: originalBytes },
    ]);
    const gw = new BlobGateway(client);

    const processed = await gw.processUploadedBlob(
      "uploads/photo.jpg",
      "image/jpeg",
    );

    expect(processed.contentType).toBe("image/jpeg");
    expect(processed.bytes).toBeGreaterThan(0);
    expect(processed.blobPathname).toMatch(/^processed\/uploads\/photo\.jpg/);

    expect(putCalls).toHaveLength(1);
    expect(putCalls[0]?.opts).toMatchObject({
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });
    expect(delCalls).toContain("uploads/photo.jpg");

    // The processed buffer round-trips through real `sharp`, so EXIF is gone.
    const stored = store.get(processed.blobPathname);
    expect(stored).toBeDefined();
    if (stored !== undefined) {
      const meta = await sharp(stored.bytes).metadata();
      expect(meta.exif).toBeUndefined();
    }
  });

  it("calls del on the original and throws when sharp fails to decode", async () => {
    const { client, delCalls } = makeFakeBlobClient([
      { pathname: "uploads/garbage.png", bytes: Buffer.from(new Uint8Array(1024)) },
    ]);
    // We bypass the magic-byte check by providing a sharpFactory that throws
    // on the *valid-magic-bytes* path. Real input has a PNG header.
    const realPng = await sharp({
      create: { width: 4, height: 4, channels: 4, background: "#000" },
    })
      .png()
      .toBuffer();
    const { client: client2, delCalls: del2 } = makeFakeBlobClient([
      { pathname: "uploads/decode-fail.png", bytes: realPng },
    ]);
    const failingSharp: SharpFactory = () =>
      ({
        rotate() {
          return this;
        },
        resize() {
          return this;
        },
        async toBuffer(): Promise<Buffer> {
          throw new Error("simulated decode failure");
        },
      });
    const gw = new BlobGateway(client2, failingSharp);

    await expect(
      gw.processUploadedBlob("uploads/decode-fail.png", "image/png"),
    ).rejects.toThrow(/image decode failed/);

    expect(del2).toContain("uploads/decode-fail.png");
    // Sanity-check the unrelated fixture is untouched.
    expect(delCalls).not.toContain("uploads/garbage.png");
    void client;
  });

  it("throws when the original blob has gone missing before processing", async () => {
    const { client } = makeFakeBlobClient([]);
    const gw = new BlobGateway(client);
    await expect(
      gw.processUploadedBlob("uploads/missing.png", "image/png"),
    ).rejects.toThrow(/blob not found/);
  });
});

describe("BlobGateway.deletePhoto", () => {
  it("delegates to blob.del with the pathname", async () => {
    const del = vi.fn(async () => undefined);
    const client = { get: vi.fn(), put: vi.fn(), del } as unknown as BlobClient;
    const gw = new BlobGateway(client);
    await gw.deletePhoto("processed/uploads/photo-x.png");
    expect(del).toHaveBeenCalledWith("processed/uploads/photo-x.png");
  });
});

describe("BlobGateway.getPhotoUrl / getPhotoUrls", () => {
  it("composes a URL from the configured store base + pathname", () => {
    const client = {} as unknown as BlobClient;
    const gw = new BlobGateway(
      client,
      undefined,
      "https://example.public.blob.vercel-storage.com",
    );
    expect(gw.getPhotoUrl("processed/uploads/foo.png")).toBe(
      "https://example.public.blob.vercel-storage.com/processed/uploads/foo.png",
    );
  });

  it("strips a trailing slash from the base and a leading slash from the pathname", () => {
    const client = {} as unknown as BlobClient;
    const gw = new BlobGateway(
      client,
      undefined,
      "https://example.public.blob.vercel-storage.com/",
    );
    expect(gw.getPhotoUrl("/processed/uploads/foo.png")).toBe(
      "https://example.public.blob.vercel-storage.com/processed/uploads/foo.png",
    );
  });

  it("tolerates surrounding double or single quotes in the env value", () => {
    const client = {} as unknown as BlobClient;
    for (const quoted of [
      '"https://example.public.blob.vercel-storage.com"',
      "'https://example.public.blob.vercel-storage.com'",
      '  "https://example.public.blob.vercel-storage.com"  ',
    ]) {
      const gw = new BlobGateway(client, undefined, quoted);
      expect(gw.getPhotoUrl("foo.png")).toBe(
        "https://example.public.blob.vercel-storage.com/foo.png",
      );
    }
  });

  it("returns null when BLOB_STORE_BASE_URL is not configured (graceful degradation, not crash)", () => {
    const client = {} as unknown as BlobClient;
    const gw = new BlobGateway(client, undefined, "");
    expect(gw.getPhotoUrl("processed/x.png")).toBeNull();
  });

  it("getPhotoUrls drops entries whose URL couldn't be composed", () => {
    const client = {} as unknown as BlobClient;
    const gw = new BlobGateway(client, undefined, "");
    expect(gw.getPhotoUrls(["a.png", "b.png"]).size).toBe(0);
  });

  it("getPhotoUrls returns a map of pathname → composed url", () => {
    const client = {} as unknown as BlobClient;
    const gw = new BlobGateway(
      client,
      undefined,
      "https://example.public.blob.vercel-storage.com",
    );
    const urls = gw.getPhotoUrls(["a.png", "b.png"]);
    expect(urls.size).toBe(2);
    expect(urls.get("a.png")).toBe(
      "https://example.public.blob.vercel-storage.com/a.png",
    );
    expect(urls.get("b.png")).toBe(
      "https://example.public.blob.vercel-storage.com/b.png",
    );
  });
});
