"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/typography";

/**
 * Drives the three JADENS print paths from plan Unit 0.1:
 *
 *   1. navigator.share({ files: [pngFile] })  → preferred if available
 *   2. window.print() against an opened PNG/PDF tab → AirPrint / Default Print
 *   3. download → "Open in JADENS" from Files / Photos
 *
 * Each "Run" attempt fetches a fresh PNG + PDF (each with its own ULID
 * stamped in the barcode) so the verifier can confirm the printed
 * barcode scans back to source 10/10 times across formats.
 */

type Format = "png" | "pdf";

interface FetchedLabel {
  ulid: string;
  blob: Blob;
  filename: string;
  url: string;
}

async function fetchLabel(format: Format): Promise<FetchedLabel> {
  const res = await fetch(`/api/print-test/${format}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`fetch ${format}: ${res.status} ${res.statusText}`);
  }
  const ulid = res.headers.get("x-test-ulid") ?? "unknown";
  const blob = await res.blob();
  const filename = `curtis-test-${ulid}.${format}`;
  const url = URL.createObjectURL(blob);
  return { ulid, blob, filename, url };
}

export function PrintTestRunner(): React.ReactElement {
  const [png, setPng] = useState<FetchedLabel | null>(null);
  const [pdf, setPdf] = useState<FetchedLabel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareSupported, setShareSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setShareSupported(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  useEffect(() => {
    return () => {
      if (png !== null) URL.revokeObjectURL(png.url);
      if (pdf !== null) URL.revokeObjectURL(pdf.url);
    };
  }, [png, pdf]);

  const runOnce = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const newPng = await fetchLabel("png");
      const newPdf = await fetchLabel("pdf");
      setPng(newPng);
      setPdf(newPdf);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setBusy(false);
    }
  };

  const share = async (label: FetchedLabel, mime: string): Promise<void> => {
    setError(null);
    try {
      const file = new File([label.blob], label.filename, { type: mime });
      const data: ShareData = { files: [file], title: label.filename };
      if (
        typeof navigator.canShare === "function" &&
        !navigator.canShare(data)
      ) {
        setError(
          `navigator.canShare returned false for ${mime}. Share-sheet path is not available on this device/browser.`,
        );
        return;
      }
      await navigator.share(data);
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "share failed");
    }
  };

  const printInTab = (label: FetchedLabel): void => {
    const w = window.open(label.url, "_blank");
    if (w === null) {
      setError("Popup blocked. Allow popups for /print-test then retry.");
      return;
    }
    w.addEventListener("load", () => {
      try {
        w.focus();
        w.print();
      } catch (err) {
        setError(err instanceof Error ? err.message : "print failed");
      }
    });
  };

  return (
    <div className="grid gap-7">
      <div className="grid gap-3">
        <Button
          variant="primary"
          onClick={() => void runOnce()}
          disabled={busy}
          className="w-full"
        >
          {busy
            ? "Generating…"
            : png === null
              ? "Generate test label"
              : "Generate again"}
        </Button>
        {error !== null ? (
          <p
            role="alert"
            className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[13px] text-signal"
          >
            {error}
          </p>
        ) : null}
        {shareSupported === false ? (
          <p className="rounded-md border border-lantern/40 bg-lantern/15 px-3 py-2 font-sans text-[13px] text-[oklch(40%_0.10_75)]">
            navigator.share is not available on this browser. Only the
            print-in-tab and download paths will work here.
          </p>
        ) : null}
      </div>

      {png !== null && pdf !== null ? (
        <>
          <PathSection
            ordinal="01"
            title="Share sheet"
            subtitle="Preferred — JADENS as share target"
          >
            <Button onClick={() => void share(png, "image/png")} className="flex-1">
              Share PNG
            </Button>
            <Button onClick={() => void share(pdf, "application/pdf")} className="flex-1">
              Share PDF
            </Button>
          </PathSection>

          <PathSection
            ordinal="02"
            title="System print"
            subtitle="AirPrint or Default Print, when JADENS is paired"
          >
            <Button onClick={() => printInTab(png)} className="flex-1">
              Print PNG
            </Button>
            <Button onClick={() => printInTab(pdf)} className="flex-1">
              Print PDF
            </Button>
          </PathSection>

          <PathSection
            ordinal="03"
            title="Download"
            subtitle="Save, then open in JADENS from Files or Photos"
          >
            <a
              href={png.url}
              download={png.filename}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-edge bg-paper px-4 font-sans text-base font-medium text-soot transition-colors hover:border-driftwood hover:bg-kraft"
            >
              Download PNG
            </a>
            <a
              href={pdf.url}
              download={pdf.filename}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-edge bg-paper px-4 font-sans text-base font-medium text-soot transition-colors hover:border-driftwood hover:bg-kraft"
            >
              Download PDF
            </a>
          </PathSection>

          <section className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <Label>Preview</Label>
              <span className="font-sans text-[11px] text-driftwood">
                ULID …<span className="tabular text-soot">{png.ulid.slice(-6)}</span>
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={png.url}
              alt="Generated test label"
              className="mx-auto w-full max-w-xs rounded-md border border-hairline bg-paper"
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

function PathSection({
  ordinal,
  title,
  subtitle,
  children,
}: {
  ordinal: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="grid gap-3 border-t border-hairline pt-5">
      <div className="flex items-baseline gap-3">
        <span className="tabular text-[12px] text-smoke">{ordinal}</span>
        <div>
          <h2 className="font-sans text-[15px] font-medium text-soot">
            {title}
          </h2>
          <p className="font-sans text-[12px] text-driftwood">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  );
}
