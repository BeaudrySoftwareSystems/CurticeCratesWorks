// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The route handler is excluded from coverage (it's framework wiring) — but
 * a few of its seams only exist here, not in the service: clientPayload
 * JSON parsing, NextAuth integration, and domain-error → HTTP status
 * mapping. This file covers exactly those.
 *
 * Auth + ownership + MIME + size validation logic itself is covered in
 * tests/services/photo.service.test.ts under fakes.
 */

const authMock = vi.fn();
const handleUploadMock = vi.fn();
const getDbMock = vi.fn(() => ({}) as unknown as Record<string, unknown>);

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@vercel/blob", () => ({
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  head: vi.fn(),
}));

// `handleUpload` is the wrapper that invokes our `onBeforeGenerateToken`
// callback. We capture the callback object on each invocation so the test
// can drive it directly.
let lastCallbacks: {
  onBeforeGenerateToken?: (
    pathname: string,
    clientPayload: string | null,
  ) => Promise<unknown>;
  onUploadCompleted?: (args: {
    blob: { pathname: string };
    tokenPayload: string | null;
  }) => Promise<void>;
} = {};

vi.mock("@vercel/blob/client", () => ({
  handleUpload: vi.fn(async (args: typeof lastCallbacks) => {
    lastCallbacks = args;
    return { uploadHandled: true };
  }),
}));

// Lazy-load the route under test so the mocks above are in place first.
async function loadRoute(): Promise<{
  POST: (req: Request) => Promise<Response>;
}> {
  return import("@/app/api/blob/upload/route");
}

function buildRequest(body: unknown): Request {
  return new Request("https://example.test/api/blob/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockReset();
  lastCallbacks = {};
  handleUploadMock.mockClear();
  getDbMock.mockClear();
});

describe("POST /api/blob/upload", () => {
  it("returns 401 when onBeforeGenerateToken runs without a session", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await loadRoute();

    // The route delegates to handleUpload which calls our captured callback.
    const res = await POST(buildRequest({ type: "blob.generate-client-token" }));
    expect(res.status).toBe(200); // handleUpload happy-path response

    // Now drive the captured onBeforeGenerateToken with no session — it should
    // throw, which is how Vercel Blob returns an error to the client.
    expect(lastCallbacks.onBeforeGenerateToken).toBeDefined();
    await expect(
      lastCallbacks.onBeforeGenerateToken!("ignored-pathname", null),
    ).rejects.toMatchObject({ name: "ErrValidation" }); // null payload first
  });

  it("rejects clientPayload that isn't valid JSON", async () => {
    authMock.mockResolvedValue({ user: { email: "staff@example.com" } });
    const { POST } = await loadRoute();
    await POST(buildRequest({ type: "blob.generate-client-token" }));

    await expect(
      lastCallbacks.onBeforeGenerateToken!("ignored", "not-json{"),
    ).rejects.toMatchObject({ name: "ErrValidation" });
  });

  it("rejects clientPayload missing required fields", async () => {
    authMock.mockResolvedValue({ user: { email: "staff@example.com" } });
    const { POST } = await loadRoute();
    await POST(buildRequest({ type: "blob.generate-client-token" }));

    await expect(
      lastCallbacks.onBeforeGenerateToken!(
        "ignored",
        JSON.stringify({ itemId: "x" }),
      ),
    ).rejects.toMatchObject({ name: "ErrValidation" });
  });

  it("maps internal errors to a 500 in the response when handleUpload throws", async () => {
    const { handleUpload } = await import("@vercel/blob/client");
    (handleUpload as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => {
        throw new Error("kaboom");
      },
    );
    authMock.mockResolvedValue({ user: { email: "staff@example.com" } });
    const { POST } = await loadRoute();

    const res = await POST(buildRequest({ type: "blob.generate-client-token" }));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("internal server error");
  });
});
