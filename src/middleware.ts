import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowlisted, STAFF_ALLOWLIST } from "@/lib/allowlist";
import { authConfig } from "@/lib/auth.config";

/**
 * Per-request allowlist enforcement. The Auth.js v5 jwt callback fires only
 * on token refresh, not on every request — so the actual revocation gate
 * lives here. Removing an email from `STAFF_ALLOWLIST` and redeploying causes
 * the next request from that email to be redirected to /sign-in with the
 * session cookies cleared.
 *
 * Public paths (/sign-in*, /api/auth*) bypass the allowlist check.
 *
 * IMPORTANT: we construct a middleware-local NextAuth instance from the
 * edge-safe `authConfig` rather than importing `auth` from `@/lib/auth`.
 * That module pulls in the Drizzle adapter and `@neondatabase/serverless`,
 * neither of which is bundleable for the edge runtime — doing so would
 * surface as `MissingAdapter: Email login requires an adapter` at runtime.
 */
const { auth } = NextAuth(authConfig);
export default auth((req: NextRequest & { auth: unknown }): NextResponse => {
  const url = req.nextUrl;
  // SAFETY: Auth.js v5 augments NextRequest with `auth: Session | null` at
  // runtime; the upstream type is `req.auth` but the wrapper signature on the
  // module entry-point hasn't been refined to expose it directly.
  const session = (req as { auth?: { user?: { email?: string | null } } | null })
    .auth;
  const email = session?.user?.email ?? null;

  // The sign-in surface is public — but if the user is already allowlisted,
  // bounce them to the home page rather than make them sign in again.
  if (url.pathname === "/sign-in" || url.pathname.startsWith("/sign-in/")) {
    if (email !== null && isAllowlisted(email, STAFF_ALLOWLIST)) {
      return NextResponse.redirect(new URL("/", url));
    }
    return NextResponse.next();
  }

  // Everything else requires an authenticated, allowlisted session.
  if (email === null) {
    const redirectTo = new URL("/sign-in", url);
    redirectTo.searchParams.set("callbackUrl", url.pathname);
    return NextResponse.redirect(redirectTo);
  }

  if (!isAllowlisted(email, STAFF_ALLOWLIST)) {
    const response = NextResponse.redirect(
      new URL("/sign-in?error=NotAllowed", url),
    );
    // Clear Auth.js v5 session cookies (HTTP and HTTPS variants) so the
    // browser stops sending an invalid session on subsequent requests.
    for (const name of [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "authjs.csrf-token",
      "__Host-authjs.csrf-token",
    ]) {
      response.cookies.delete(name);
    }
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Apply to all paths except:
     * - /api/auth/* (Auth.js handlers must run unauthenticated)
     * - /_next/static/* and /_next/image/* (build artifacts)
     * - /brand/* (the logo + brand assets must load on the sign-in page)
     * - /favicon.ico, /robots.txt, /sitemap.xml (static assets)
     */
    "/((?!api/auth|_next/static|_next/image|brand/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
