/**
 * Pure utilities for the staff email allowlist. Kept in a module that does
 * NOT import `next-auth`, so unit tests can exercise the parsing and lookup
 * logic without pulling in the framework runtime.
 */

/**
 * Parse a comma-separated allowlist string from `STAFF_ALLOWLIST` into a
 * normalized Set for O(1) lookups.
 *
 * - Trims whitespace around each entry
 * - Lowercases (email comparison is case-insensitive)
 * - Drops empty entries
 * - Deduplicates
 */
export function parseAllowlist(input: string | undefined): Set<string> {
  if (input === undefined || input.trim() === "") {
    return new Set();
  }

  const entries = input
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return new Set(entries);
}

/**
 * O(1) check whether `email` is on the staff allowlist. Comparison is
 * case-insensitive. An empty allowlist denies everyone.
 */
export function isAllowlisted(
  email: string | null | undefined,
  allowlist: Set<string>,
): boolean {
  if (email === null || email === undefined || email.trim() === "") {
    return false;
  }
  return allowlist.has(email.trim().toLowerCase());
}

/**
 * The current allowlist, parsed once at module load. Vercel function instances
 * cold-start on redeploy, so updating the env var + redeploying causes new
 * instances to pick up the new allowlist within seconds.
 */
export const STAFF_ALLOWLIST = parseAllowlist(process.env["STAFF_ALLOWLIST"]);
