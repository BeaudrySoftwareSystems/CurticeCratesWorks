import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { STAFF_ALLOWLIST, isAllowlisted } from "@/lib/allowlist";

export { STAFF_ALLOWLIST, isAllowlisted, parseAllowlist } from "@/lib/allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Resend({
      apiKey: process.env["AUTH_RESEND_KEY"],
      from: process.env["EMAIL_FROM"],
      maxAge: 15 * 60, // magic links expire in 15 minutes
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours; per-request enforcement still happens in middleware
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
      // no longer on the allowlist. Note that this only runs on token refresh
      // (not every request) — middleware is the per-request gate.
      const email = typeof token.email === "string" ? token.email : null;
      if (email !== null && !isAllowlisted(email, STAFF_ALLOWLIST)) {
        return {};
      }
      return token;
    },
  },
  trustHost: true,
});
