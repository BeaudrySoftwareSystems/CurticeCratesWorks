"use server";

import { signOut } from "@/lib/auth";

/**
 * Sign-out action invoked from the page-header user menu. Clears the
 * Auth.js session and redirects to /sign-in. Wrapping `signOut` in a
 * Server Action lets us bind it to a `<form action>` so it works
 * progressively (no client JS required) — matters for the gloved
 * one-handed warehouse use that the rest of the surface is tuned for.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/sign-in" });
}
