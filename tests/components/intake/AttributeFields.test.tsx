// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AttributeDefinition } from "@/domain/category";
import { AttributeFields } from "@/components/intake/AttributeFields";

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

describe("AttributeFields", () => {
  it("renders the empty-category placeholder when there are no definitions", () => {
    render(<AttributeFields definitions={[]} />);
    expect(
      screen.getByText(/no additional attributes/i),
    ).toBeInTheDocument();
  });

  it("renders a humanized label and required marker for required text fields", () => {
    render(
      <AttributeFields
        definitions={[def({ key: "brand_name", type: "text", required: true })]}
      />,
    );
    expect(screen.getByLabelText(/Brand Name/i)).toBeInTheDocument();
    // required marker is aria-hidden but visible in DOM
    expect(document.body.textContent).toContain("*");
  });

  it("renders a number input for number-typed fields with inputMode='numeric'", () => {
    render(
      <AttributeFields
        definitions={[def({ key: "pit_to_pit", type: "number" })]}
      />,
    );
    const input = screen.getByLabelText(/Pit To Pit/i) as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.inputMode).toBe("numeric");
  });

  it("renders a select for enum-typed fields with the options listed", () => {
    render(
      <AttributeFields
        definitions={[
          def({
            key: "condition",
            type: "enum",
            enumOptions: ["NM", "LP", "MP", "HP"],
            required: true,
          }),
        ]}
      />,
    );
    const select = screen.getByLabelText(/Condition/i) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    const optionTexts = Array.from(select.options).map((o) => o.value);
    expect(optionTexts).toEqual(["", "NM", "LP", "MP", "HP"]);
  });

  it("renders a checkbox for boolean fields", () => {
    render(
      <AttributeFields definitions={[def({ key: "graded", type: "boolean" })]} />,
    );
    const cb = screen.getByLabelText(/Graded/i, { selector: "input" });
    expect((cb as HTMLInputElement).type).toBe("checkbox");
  });

  it("namespaces all input names with attr.<key>", () => {
    render(
      <AttributeFields
        definitions={[
          def({ key: "size", type: "text", required: true }),
          def({ key: "graded", type: "boolean" }),
        ]}
      />,
    );
    const size = screen.getByLabelText(/Size/i) as HTMLInputElement;
    expect(size.name).toBe("attr.size");
    const graded = screen.getByLabelText(/Graded/i, { selector: "input" });
    expect((graded as HTMLInputElement).name).toBe("attr.graded");
  });

  it("renders an inline error message keyed by attr.<key>", () => {
    render(
      <AttributeFields
        definitions={[def({ key: "size", type: "text", required: true })]}
        fieldErrors={{ "attr.size": "Size is required" }}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Size is required");
  });

  it("preserves typed values via defaults on re-render", () => {
    render(
      <AttributeFields
        definitions={[def({ key: "brand", type: "text" })]}
        defaults={{ brand: "Levi's" }}
      />,
    );
    const input = screen.getByLabelText(/Brand/i) as HTMLInputElement;
    expect(input.defaultValue).toBe("Levi's");
  });
});
