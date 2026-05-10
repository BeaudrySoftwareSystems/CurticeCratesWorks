import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { renderTestLabel } from "@/lib/print-test";

/**
 * Returns a freshly-rendered 4×6 PNG label for JADENS verification
 * (Unit 0.1). Cache-Control is `no-store` so each fetch yields a new
 * ULID — that lets the verifier confirm the printed barcode scans
 * back to the displayed ULID across multiple attempts.
 */
export async function GET(): Promise<Response> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { png, ulid } = await renderTestLabel();
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "content-disposition": `inline; filename="curtis-test-${ulid}.png"`,
      "cache-control": "no-store",
      "x-test-ulid": ulid,
    },
  });
}
