// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderTestLabel } from "@/lib/print-test";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_MAGIC = Buffer.from("%PDF-", "utf8");

describe("renderTestLabel (Unit 0.1 scaffolding)", () => {
  it("returns a 4×6 inch PNG and a non-empty PDF sharing one ULID", async () => {
    const { png, pdf, ulid } = await renderTestLabel();

    expect(ulid).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(png.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    expect(pdf.subarray(0, 5).equals(PDF_MAGIC)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1024);

    // Confirm the rendered PNG is the 203 dpi 4×6 size the JADENS app
    // expects — drift here would invalidate the verification.
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(812);
    expect(meta.height).toBe(1218);
  });

  it("emits a fresh ULID on every call", async () => {
    const a = await renderTestLabel();
    const b = await renderTestLabel();
    expect(a.ulid).not.toBe(b.ulid);
  });
});
