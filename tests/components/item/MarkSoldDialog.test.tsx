// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markSoldAction: vi.fn(async () => ({ status: "idle" as const })),
}));

vi.mock("@/app/actions/sale", () => ({
  markSoldAction: mocks.markSoldAction,
}));

import { MarkSoldDialog } from "@/components/item/MarkSoldDialog";

// jsdom doesn't implement HTMLDialogElement.showModal/close — stub them.
function stubDialog(): void {
  if (typeof HTMLDialogElement.prototype.showModal !== "function") {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (typeof HTMLDialogElement.prototype.close !== "function") {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
}

describe("MarkSoldDialog", () => {
  it("opens the dialog when the trigger is clicked", () => {
    stubDialog();
    render(<MarkSoldDialog itemId="item-1" defaultListPrice={null} />);

    const trigger = screen.getByRole("button", { name: /mark sold/i });
    fireEvent.click(trigger);

    const dialog = document.querySelector("dialog");
    expect(dialog?.hasAttribute("open")).toBe(true);
    expect(screen.getByLabelText(/^Sold price/i)).toBeRequired();
  });

  it("renders the platform select with all enum values + the not-yet-known option", () => {
    stubDialog();
    render(<MarkSoldDialog itemId="item-1" defaultListPrice={null} />);
    fireEvent.click(screen.getByRole("button", { name: /mark sold/i }));

    const platform = screen.getByLabelText(/Platform/i) as HTMLSelectElement;
    const labels = Array.from(platform.options).map((o) => o.textContent);
    expect(labels[0]).toMatch(/Not yet known/i);
    expect(labels.slice(1).sort()).toEqual(
      ["Depop", "Other", "Poshmark", "eBay"].sort(),
    );
    // Default is the empty value (null platform).
    expect(platform.value).toBe("");
  });

  it("seeds the sold price with the item's current list price when provided", () => {
    stubDialog();
    render(<MarkSoldDialog itemId="item-1" defaultListPrice="45.00" />);
    fireEvent.click(screen.getByRole("button", { name: /mark sold/i }));

    const sold = screen.getByLabelText(/^Sold price/i) as HTMLInputElement;
    expect(sold.defaultValue).toBe("45.00");
  });

  it("includes a hidden itemId input so the action receives the item id", () => {
    stubDialog();
    const { container } = render(
      <MarkSoldDialog itemId="abc-123" defaultListPrice={null} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /mark sold/i }));
    const hidden = container.querySelector(
      'input[name="itemId"]',
    ) as HTMLInputElement | null;
    expect(hidden?.value).toBe("abc-123");
  });

  it("defaults the soldAt date to today's ISO date", () => {
    stubDialog();
    render(<MarkSoldDialog itemId="item-1" defaultListPrice={null} />);
    fireEvent.click(screen.getByRole("button", { name: /mark sold/i }));
    const date = screen.getByLabelText(/Sold date/i) as HTMLInputElement;
    expect(date.defaultValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
