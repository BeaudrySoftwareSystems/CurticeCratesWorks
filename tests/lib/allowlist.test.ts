import { describe, it, expect } from "vitest";
import { parseAllowlist, isAllowlisted } from "@/lib/allowlist";

describe("parseAllowlist", () => {
  it("returns an empty Set for undefined input", () => {
    expect(parseAllowlist(undefined)).toEqual(new Set());
  });

  it("returns an empty Set for empty string", () => {
    expect(parseAllowlist("")).toEqual(new Set());
  });

  it("returns an empty Set for whitespace-only input", () => {
    expect(parseAllowlist("   ")).toEqual(new Set());
    expect(parseAllowlist("\t\n  ")).toEqual(new Set());
  });

  it("parses a single email", () => {
    expect(parseAllowlist("justin@example.com")).toEqual(
      new Set(["justin@example.com"]),
    );
  });

  it("parses comma-separated emails and trims whitespace", () => {
    expect(parseAllowlist("justin@example.com, jaden@example.com")).toEqual(
      new Set(["justin@example.com", "jaden@example.com"]),
    );
    expect(
      parseAllowlist("  justin@example.com  ,  jaden@example.com  "),
    ).toEqual(new Set(["justin@example.com", "jaden@example.com"]));
  });

  it("lowercases entries (email comparison is case-insensitive)", () => {
    expect(parseAllowlist("Justin@Example.com,JADEN@example.com")).toEqual(
      new Set(["justin@example.com", "jaden@example.com"]),
    );
  });

  it("deduplicates", () => {
    expect(
      parseAllowlist("justin@example.com,justin@example.com,JUSTIN@EXAMPLE.COM"),
    ).toEqual(new Set(["justin@example.com"]));
  });

  it("drops empty entries from trailing or duplicate commas", () => {
    expect(parseAllowlist("justin@example.com,,jaden@example.com,")).toEqual(
      new Set(["justin@example.com", "jaden@example.com"]),
    );
  });
});

describe("isAllowlisted", () => {
  const allowlist = new Set(["justin@example.com", "jaden@example.com"]);

  it("allows an email present in the allowlist", () => {
    expect(isAllowlisted("justin@example.com", allowlist)).toBe(true);
  });

  it("denies an email not in the allowlist", () => {
    expect(isAllowlisted("intruder@example.com", allowlist)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isAllowlisted("Justin@Example.com", allowlist)).toBe(true);
    expect(isAllowlisted("JUSTIN@EXAMPLE.COM", allowlist)).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isAllowlisted("  justin@example.com  ", allowlist)).toBe(true);
  });

  it("denies null and undefined", () => {
    expect(isAllowlisted(null, allowlist)).toBe(false);
    expect(isAllowlisted(undefined, allowlist)).toBe(false);
  });

  it("denies empty and whitespace-only strings", () => {
    expect(isAllowlisted("", allowlist)).toBe(false);
    expect(isAllowlisted("   ", allowlist)).toBe(false);
  });

  it("denies all when allowlist is empty (closed by default)", () => {
    const empty = new Set<string>();
    expect(isAllowlisted("anyone@example.com", empty)).toBe(false);
  });
});
