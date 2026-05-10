import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { getDb } from "@/db/client";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { authConfig } from "@/lib/auth.config";

export { STAFF_ALLOWLIST, isAllowlisted, parseAllowlist } from "@/lib/allowlist";

/**
 * Node-runtime Auth.js config. Layers the Drizzle adapter and the Resend
 * (magic-link) provider on top of the edge-safe `authConfig`. Magic-link
 * providers require persistent storage for the verification token even when
 * sessions are JWT-backed — that storage is the `verification_tokens` table
 * owned by `DrizzleAdapter`. The `sessions` table goes unused under
 * `strategy: "jwt"` but is still required by the adapter contract.
 *
 * IMPORTANT: do not import this file from `middleware.ts` or any other edge
 * surface. Edge code must import `auth.config.ts` directly.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env["AUTH_RESEND_KEY"],
      from: process.env["EMAIL_FROM"],
      maxAge: 15 * 60, // magic links expire in 15 minutes
    }),
  ],
});
