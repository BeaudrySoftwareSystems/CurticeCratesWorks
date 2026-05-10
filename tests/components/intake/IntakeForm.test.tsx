// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  finalizeIntakeAction: vi.fn(async () => ({ status: "idle" as const })),
  upload: vi.fn(),
}));

vi.mock("@/app/actions/intake", () => ({
  finalizeIntakeAction: mocks.finalizeIntakeAction,
}));

vi.mock("@vercel/blob/client", () => ({
  upload: mocks.upload,
}));

import { IntakeForm } from "@/components/intake/IntakeForm";

describe("IntakeForm", () => {
  it("renders the section eyebrows, sticky save button, and required core fields", () => {
    render(
      <IntakeForm
        itemId="item-1"
        categoryId="cat-1"
        categoryName="Clothing"
        definitions={[]}
      />,
    );

    // The page title shows the category name.
    expect(screen.getByText(/New Clothing/i)).toBeInTheDocument();
    // Section eyebrows are uppercase Labels (not h2 headings) per the new
    // hierarchy — assert their visible text instead of role.
    expect(screen.getByText(/^Photos$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Attributes$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Location$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Pricing$/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/^Cost/i)).toBeRequired();
    expect(screen.getByLabelText(/List price/i)).not.toBeRequired();
    expect(
      screen.getByRole("button", { name: /save & continue/i }),
    ).toBeInTheDocument();
  });

  it("includes hidden itemId and categoryId fields so the action receives them", () => {
    const { container } = render(
      <IntakeForm
        itemId="item-1"
        categoryId="cat-1"
        categoryName="Clothing"
        definitions={[]}
      />,
    );
    const itemInput = container.querySelector(
      'input[name="itemId"]',
    ) as HTMLInputElement | null;
    const categoryInput = container.querySelector(
      'input[name="categoryId"]',
    ) as HTMLInputElement | null;
    expect(itemInput?.value).toBe("item-1");
    expect(categoryInput?.value).toBe("cat-1");
  });
});
