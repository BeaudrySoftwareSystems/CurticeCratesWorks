// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  quickRecordSaleAction: vi.fn(async () => ({ status: "idle" as const })),
}));

vi.mock("@/app/actions/sale", () => ({
  quickRecordSaleAction: mocks.quickRecordSaleAction,
}));

import { QuickSaleForm } from "@/components/sale/QuickSaleForm";

describe("QuickSaleForm", () => {
  it("renders required price + optional title/category/platform/buyer fields", () => {
    render(
      <QuickSaleForm
        categories={[
          { id: "cat-1", name: "Clothing" },
          { id: "cat-2", name: "Pokemon Single" },
        ]}
      />,
    );
    expect(screen.getByLabelText(/^Sold price/i)).toBeRequired();
    expect(screen.getByLabelText(/Title/i)).not.toBeRequired();
    expect(screen.getByLabelText(/Buyer reference/i)).not.toBeRequired();

    const platform = screen.getByLabelText(/Platform/i) as HTMLSelectElement;
    expect(platform.value).toBe("");
    const platformLabels = Array.from(platform.options).map(
      (o) => o.textContent,
    );
    expect(platformLabels[0]).toMatch(/Not yet known/i);

    const category = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    expect(category.value).toBe("");
    const categoryLabels = Array.from(category.options).map(
      (o) => o.textContent,
    );
    expect(categoryLabels[0]).toMatch(/Uncategorized/i);
    expect(categoryLabels.slice(1).sort()).toEqual(
      ["Clothing", "Pokemon Single"].sort(),
    );

    expect(
      screen.getByRole("button", { name: /record sale/i }),
    ).toBeInTheDocument();
  });

  it("defaults the soldAt date to today's ISO date", () => {
    render(<QuickSaleForm categories={[]} />);
    const date = screen.getByLabelText(/Sold date/i) as HTMLInputElement;
    expect(date.defaultValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
