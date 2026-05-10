import type { NextAuthConfig } from "next-auth";
import { STAFF_ALLOWLIST, isAllowlisted } from "@/lib/allowlist";

/**
 * Edge-safe Auth.js config shared between the Node-runtime route handler
 * (`src/lib/auth.ts`) and the edge-runtime middleware (`src/middleware.ts`).
 *
 * It must NOT import the Drizzle adapter, the database client, or any
 * provider that requires database access (e.g. Resend / Email). Doing so
 * pulls `@neondatabase/serverless` (WebSocket-based) into the edge bundle,
 * which either fails to bundle or strips silently — the latter manifests at
 * runtime as `MissingAdapter: Email login requires an adapter`.
 *
 * The full Node-runtime config in `auth.ts` spreads this object and layers
 * on the adapter and the Resend provider.
 */
export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h; per-request enforcement still happens in middleware
  },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/sent",
    error: "/sign-in",
  },
  callbacks: {
    /**
     * Defense-in-depth: deny token issuance if the email leaves the allowlist
     * between sign-in and refresh. The primary revocation gate is middleware
     * (see `src/middleware.ts`); this callback is the secondary check.
     */
    async signIn({ user }) {
      const email = user.email;
      if (email === null || email === undefined) {
        return false;
      }
      return isAllowlisted(email, STAFF_ALLOWLIST);
    },
    async jwt({ token }) {
      // Defense-in-depth: invalidate JWT contents on refresh if the email is
      // no longer on the allowlist. Only fires on token refresh — middleware
      // is the per-request gate.
      const email = typeof token.email === "string" ? token.email : null;
      if (email !== null && !isAllowlisted(email, STAFF_ALLOWLIST)) {
        return {};
      }
      return token;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export default authConfig;
