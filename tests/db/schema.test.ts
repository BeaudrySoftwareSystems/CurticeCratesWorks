import { describe, it, expect, expectTypeOf } from "vitest";
import {
  categories,
  attributeDefinitions,
  items,
  photos,
  sales,
  itemStatusEnum,
  soldPlatformEnum,
  attributeTypeEnum,
  type Category,
  type NewCategory,
  type Item,
  type NewItem,
  type Sale,
  type NewSale,
} from "@/db/schema";

describe("schema definition", () => {
  it("exports five tables", () => {
    expect(categories).toBeDefined();
    expect(attributeDefinitions).toBeDefined();
    expect(items).toBeDefined();
    expect(photos).toBeDefined();
    expect(sales).toBeDefined();
  });

  it("exports three pgEnums with the expected values", () => {
    expect(itemStatusEnum.enumValues).toEqual(["stocked", "sold", "archived"]);
    expect(soldPlatformEnum.enumValues).toEqual([
      "Depop",
      "Poshmark",
      "eBay",
      "Other",
    ]);
    expect(attributeTypeEnum.enumValues).toEqual([
      "text",
      "number",
      "decimal",
      "boolean",
      "enum",
    ]);
  });

  it("does not include a 'listed' status (dropped from v1 lifecycle)", () => {
    expect(itemStatusEnum.enumValues).not.toContain("listed");
  });
});

describe("schema type inference", () => {
  it("Category has the expected select shape", () => {
    expectTypeOf<Category>().toMatchTypeOf<{
      id: string;
      name: string;
      description: string | null;
      sortOrder: number;
      createdAt: Date;
    }>();
  });

  it("NewCategory makes auto-generated fields optional", () => {
    // id, sortOrder, createdAt all have defaults — should be optional on insert.
    const valid: NewCategory = { name: "Test" };
    expect(valid).toBeDefined();
  });

  it("Item attributes is typed as Record<string, unknown>", () => {
    expectTypeOf<Item["attributes"]>().toEqualTypeOf<Record<string, unknown>>();
  });

  it("Item status is constrained to the enum union", () => {
    expectTypeOf<Item["status"]>().toEqualTypeOf<
      "stocked" | "sold" | "archived"
    >();
  });

  it("NewItem accepts a minimal payload (id and display_id auto-generated)", () => {
    // category_id and most fields are nullable / have defaults.
    const valid: NewItem = {};
    expect(valid).toBeDefined();
  });

  it("Sale.platform is nullable (unset = 'not yet known')", () => {
    expectTypeOf<Sale["platform"]>().toEqualTypeOf<
      "Depop" | "Poshmark" | "eBay" | "Other" | null
    >();
  });

  it("NewSale requires itemId and soldPrice but platform is optional", () => {
    const valid: NewSale = { itemId: "01H...", soldPrice: "10.00" };
    expect(valid).toBeDefined();
  });
});

describe("schema column shape", () => {
  it("items.display_id is a not-null unique column", () => {
    expect(items.displayId.notNull).toBe(true);
    expect(items.displayId.isUnique).toBe(true);
  });

  it("items.intake_skipped has a default of false", () => {
    expect(items.intakeSkipped.hasDefault).toBe(true);
  });

  it("items.id is a text PK with a default function (ULID)", () => {
    expect(items.id.primary).toBe(true);
    expect(items.id.hasDefault).toBe(true);
  });

  it("photos.itemId is required (not-null FK)", () => {
    expect(photos.itemId.notNull).toBe(true);
  });

  it("sales.platform is nullable", () => {
    expect(sales.platform.notNull).toBe(false);
  });
});
