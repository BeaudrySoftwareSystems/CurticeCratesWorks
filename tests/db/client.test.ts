import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("db/client", () => {
  let originalDatabaseUrl: string | undefined;

  beforeEach(() => {
    originalDatabaseUrl = process.env["DATABASE_URL"];
    vi.resetModules();
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env["DATABASE_URL"];
    } else {
      process.env["DATABASE_URL"] = originalDatabaseUrl;
    }
    vi.resetModules();
  });

  it("throws a clear error when DATABASE_URL is unset", async () => {
    delete process.env["DATABASE_URL"];
    const { getDb } = await import("@/db/client");
    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
  });

  it("throws a clear error when DATABASE_URL is empty string", async () => {
    process.env["DATABASE_URL"] = "";
    const { getDb } = await import("@/db/client");
    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
  });
});
