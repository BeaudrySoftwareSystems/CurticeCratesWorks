import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { renderTestLabel } from "@/lib/print-test";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { pdf, ulid } = await renderTestLabel();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="curtis-test-${ulid}.pdf"`,
      "cache-control": "no-store",
      "x-test-ulid": ulid,
    },
  });
}
