import { ulid } from "ulid";
// bwip-js's Node entry — the bare specifier resolves the browser bundle
// under `moduleResolution: "bundler"`, which has no `toBuffer`.
import bwipjs from "bwip-js/node";
import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";

/**
 * Verification scaffolding for the JADENS 268BT print path (plan Unit 0.1).
 *
 * Generates a 4×6 inch test label at 203 DPI (812×1218 px) containing a
 * Code128 barcode of a known ULID plus the placeholder "TEST 000001".
 * The page at /print-test fetches both PNG and PDF variants and exposes
 * three share routes — share sheet, browser print, download-and-open —
 * so we can pick the most reliable JADENS path before committing to it
 * in Unit 11.
 *
 * NOT production code. Will be removed (or hard-coded into the real
 * label renderer) once Unit 0.1 produces a verdict.
 */

const LABEL_WIDTH_PX = 812; // 4 in × 203 dpi
const LABEL_HEIGHT_PX = 1218; // 6 in × 203 dpi
const TEST_DISPLAY_ID = "TEST 000001";

export interface TestLabelPayload {
  png: Buffer;
  pdf: Buffer;
  ulid: string;
}

/**
 * Build both PNG and PDF together so they share the same ULID — important
 * for Unit 0.1's "barcode scans back to source" verification (10/10 target
 * across both formats).
 */
export async function renderTestLabel(): Promise<TestLabelPayload> {
  const id = ulid();
  const png = await renderPng(id);
  const pdf = await renderPdf(png);
  return { png, pdf, ulid: id };
}

async function renderPng(id: string): Promise<Buffer> {
  const barcodePng: Buffer = await bwipjs.toBuffer({
    bcid: "code128",
    text: id,
    scale: 3,
    height: 30,
    includetext: true,
    textxalign: "center",
    textsize: 10,
    paddingwidth: 8,
    paddingheight: 8,
    backgroundcolor: "FFFFFF",
  });
  const barcodeBase64 = barcodePng.toString("base64");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${LABEL_WIDTH_PX}" height="${LABEL_HEIGHT_PX}" viewBox="0 0 ${LABEL_WIDTH_PX} ${LABEL_HEIGHT_PX}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="50%" y="180" font-family="-apple-system, sans-serif" font-size="120" font-weight="700" text-anchor="middle" fill="#000">${TEST_DISPLAY_ID}</text>
      <text x="50%" y="280" font-family="-apple-system, sans-serif" font-size="46" text-anchor="middle" fill="#444">JADENS verification</text>
      <image x="56" y="540" width="700" height="280" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${barcodeBase64}" />
      <text x="50%" y="${LABEL_HEIGHT_PX - 80}" font-family="-apple-system, sans-serif" font-size="28" text-anchor="middle" fill="#666">Curtis Crates · ${new Date().toISOString().slice(0, 10)}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderPdf(pngBytes: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.create();
  // 4×6 inches in PDF user-space (1 in = 72 pt).
  const page = doc.addPage([4 * 72, 6 * 72]);
  const png = await doc.embedPng(pngBytes);
  const dims = png.scaleToFit(page.getWidth(), page.getHeight());
  page.drawImage(png, {
    x: (page.getWidth() - dims.width) / 2,
    y: (page.getHeight() - dims.height) / 2,
    width: dims.width,
    height: dims.height,
  });
  // pdf-lib needs at least one referenced font for some readers — embed
  // Helvetica so AirPrint and the JADENS app don't choke on a fontless PDF.
  await doc.embedFont(StandardFonts.Helvetica);
  const bytes = await doc.save();
  return Buffer.from(bytes);
}
