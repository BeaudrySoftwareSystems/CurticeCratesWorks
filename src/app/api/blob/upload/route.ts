import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import {
  ErrInvalidUpload,
  ErrNotFound,
  ErrUnauthenticated,
  ErrValidation,
} from "@/domain/errors";
import { BlobGateway } from "@/gateways/blob.gateway";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { ItemRepository } from "@/repositories/item.repository";
import { PhotoRepository } from "@/repositories/photo.repository";
import { PhotoService } from "@/services/photo.service";
import { del, get, head, put } from "@vercel/blob";

/**
 * The single Route Handler exception in v1 (architecture rule B3 in the
 * plan). Vercel Blob requires `handleUpload` to live behind a POST endpoint
 * so it can issue the upload token and receive the upload-completed
 * callback.
 *
 * The handler itself is a thin adapter: it parses the inbound body, asks
 * NextAuth for the session, and delegates every business decision to
 * `PhotoService`. Domain errors map to HTTP status codes here and only
 * here — the service never sees `Response` or `NextResponse`.
 */

interface UploadClientPayload {
  itemId: string;
  declaredMime: string;
  declaredBytes?: number;
}

function buildService(): PhotoService {
  const db = getDb();
  return new PhotoService(
    new PhotoRepository(db),
    new ItemRepository(db),
    new BlobGateway({ get, put, del, head }),
    logger,
  );
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;
  const service = buildService();

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();
        const sessionEmail = session?.user?.email ?? null;
        const parsed = parseClientPayload(clientPayload);
        const auth0 = await service.validateUploadRequest(sessionEmail, parsed);
        return {
          allowedContentTypes: [...auth0.allowedContentTypes],
          maximumSizeInBytes: auth0.maximumSizeInBytes,
          tokenPayload: auth0.tokenPayload,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (tokenPayload === null || tokenPayload === undefined) {
          throw new Error("upload-completed callback received no tokenPayload");
        }
        const payload = JSON.parse(tokenPayload) as {
          itemId: string;
          declaredMime: string;
        };
        await service.completeUpload(blob.pathname, payload);
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return errorToResponse(err);
  }
}

function parseClientPayload(raw: string | null | undefined): UploadClientPayload {
  if (raw === null || raw === undefined || raw === "") {
    throw new ErrValidation(["clientPayload: missing"]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ErrValidation(["clientPayload: not valid JSON"]);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new ErrValidation(["clientPayload: not an object"]);
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj["itemId"] !== "string") {
    throw new ErrValidation(["clientPayload.itemId: required string"]);
  }
  if (typeof obj["declaredMime"] !== "string") {
    throw new ErrValidation(["clientPayload.declaredMime: required string"]);
  }
  return {
    itemId: obj["itemId"],
    declaredMime: obj["declaredMime"],
    ...(typeof obj["declaredBytes"] === "number"
      ? { declaredBytes: obj["declaredBytes"] }
      : {}),
  };
}

function errorToResponse(err: unknown): Response {
  if (err instanceof ErrUnauthenticated) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ErrNotFound) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof ErrValidation || err instanceof ErrInvalidUpload) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  logger.error({ err }, "unexpected error in /api/blob/upload");
  return NextResponse.json({ error: "internal server error" }, { status: 500 });
}
