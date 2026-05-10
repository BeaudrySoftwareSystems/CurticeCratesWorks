import { describe, expect, it } from "vitest";
import { buildZodSchema } from "@/lib/attributes";
import type { AttributeDefinition } from "@/domain/category";
import { TEXT_MAX_LENGTH } from "@/domain/category";

function def(
  partial: Partial<AttributeDefinition> & {
    key: string;
    type: AttributeDefinition["type"];
  },
): AttributeDefinition {
  return {
    id: `def-${partial.key}`,
    categoryId: "cat-1",
    key: partial.key,
    type: partial.type,
    enumOptions: partial.enumOptions ?? null,
    required: partial.required ?? false,
    sortOrder: partial.sortOrder ?? 0,
  };
}

describe("buildZodSchema", () => {
  it("returns a permissive z.object({}) when no definitions are given", () => {
    const schema = buildZodSchema([]);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ unrelated: "ignored" })).toEqual({});
  });

  it("accepts a fully-typed valid Clothing input", () => {
    const schema = buildZodSchema([
      def({ key: "brand", type: "text", required: true }),
      def({ key: "size", type: "text", required: true }),
      def({ key: "pit_to_pit", type: "number", required: false }),
    ]);
    const out = schema.parse({
      brand: "Nike",
      size: "M",
      pit_to_pit: 22,
    });
    expect(out).toEqual({ brand: "Nike", size: "M", pit_to_pit: 22 });
  });

  it("accepts a fully-typed valid Pokémon Single input (enum + boolean)", () => {
    const schema = buildZodSchema([
      def({ key: "set", type: "text", required: true }),
      def({ key: "card_number", type: "text", required: true }),
      def({
        key: "condition",
        type: "enum",
        enumOptions: ["NM", "LP", "MP", "HP"],
        required: true,
      }),
      def({ key: "graded", type: "boolean", required: false }),
    ]);
    expect(
      schema.parse({
        set: "Base",
        card_number: "4/102",
        condition: "NM",
        graded: false,
      }),
    ).toEqual({
      set: "Base",
      card_number: "4/102",
      condition: "NM",
      graded: false,
    });
  });

  it("rejects input missing a required attribute", () => {
    const schema = buildZodSchema([
      def({ key: "brand", type: "text", required: true }),
      def({ key: "size", type: "text", required: true }),
    ]);
    const result = schema.safeParse({ brand: "Nike" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "size")).toBe(true);
    }
  });

  it("rejects wrong type (string passed for number)", () => {
    const schema = buildZodSchema([
      def({ key: "pit_to_pit", type: "number", required: true }),
    ]);
    expect(
      schema.safeParse({ pit_to_pit: "twenty-two" }).success,
    ).toBe(false);
  });

  it("rejects an invalid enum value", () => {
    const schema = buildZodSchema([
      def({
        key: "condition",
        type: "enum",
        enumOptions: ["NM", "LP", "MP", "HP"],
        required: true,
      }),
    ]);
    expect(schema.safeParse({ condition: "Mint" }).success).toBe(false);
    expect(schema.safeParse({ condition: "NM" }).success).toBe(true);
  });

  it("rejects text values longer than TEXT_MAX_LENGTH", () => {
    const schema = buildZodSchema([
      def({ key: "notes", type: "text", required: false }),
    ]);
    expect(
      schema.safeParse({ notes: "x".repeat(TEXT_MAX_LENGTH + 1) }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ notes: "x".repeat(TEXT_MAX_LENGTH) }).success,
    ).toBe(true);
  });

  it("treats decimal as a number-typed field", () => {
    const schema = buildZodSchema([
      def({ key: "weight", type: "decimal", required: true }),
    ]);
    expect(schema.safeParse({ weight: 1.5 }).success).toBe(true);
    expect(schema.safeParse({ weight: "1.5" }).success).toBe(false);
  });

  it("treats optional attributes as optional (input may omit them)", () => {
    const schema = buildZodSchema([
      def({ key: "brand", type: "text", required: false }),
      def({ key: "graded", type: "boolean", required: false }),
    ]);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ brand: "Nike" })).toEqual({ brand: "Nike" });
  });

  it("throws when an enum definition is missing enumOptions", () => {
    expect(() =>
      buildZodSchema([
        def({ key: "condition", type: "enum", enumOptions: null, required: true }),
      ]),
    ).toThrow();
  });

  it("throws when any enum option exceeds the label-printer length cap", () => {
    expect(() =>
      buildZodSchema([
        def({
          key: "condition",
          type: "enum",
          enumOptions: ["NM", "x".repeat(51)],
          required: true,
        }),
      ]),
    ).toThrow(/exceeding 50 chars/);
  });

  it("throws when an enum definition has an empty enumOptions array", () => {
    expect(() =>
      buildZodSchema([
        def({ key: "condition", type: "enum", enumOptions: [], required: true }),
      ]),
    ).toThrow();
  });
});
