"use client";

import { useEffect, useState } from "react";

/**
 * Drives the three JADENS print paths from the plan's Unit 0.1:
 *
 *   1. navigator.share({ files: [pngFile] })  → preferred if available
 *   2. window.print() against an opened PNG/PDF tab → AirPrint / Default Print
 *   3. download → "Open in JADENS" from Files / Photos
 *
 * Each "Run" attempt fetches a fresh PNG + PDF (each with its own ULID
 * stamped in the barcode) so the verifier can confirm the printed
 * barcode scans back to the source 10/10 times across formats.
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
      // Sequential — share routes care about ULID/format pairing per attempt.
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
          `navigator.canShare returned false for ${mime} — share-sheet path is not available on this device/browser.`,
        );
        return;
      }
      await navigator.share(data);
    } catch (err) {
      // User-cancelled shares throw AbortError — keep that quiet.
      if ((err as DOMException)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "share failed");
    }
  };

  const printInTab = (label: FetchedLabel): void => {
    // Open in a new tab and trigger the system print dialog. This is the
    // path that surfaces AirPrint / Default Print, which is how a paired
    // JADENS would receive the job if installed as a system printer.
    const w = window.open(label.url, "_blank");
    if (w === null) {
      setError("Popup blocked — allow popups for /print-test then retry.");
      return;
    }
    // Give the document a moment to render before invoking print.
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
    <div className="grid gap-6">
      <section className="grid gap-3">
        <button
          type="button"
          onClick={() => void runOnce()}
          disabled={busy}
          className="min-h-12 w-full rounded-md bg-blue-600 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {busy ? "Generating…" : png === null ? "Generate test label" : "Generate again"}
        </button>
        {error !== null ? (
          <p
            role="alert"
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </p>
        ) : null}
        {shareSupported === false ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            navigator.share is not available on this browser — only the
            print-in-tab and download paths will work here.
          </p>
        ) : null}
      </section>

      {png !== null && pdf !== null ? (
        <>
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Path 1 · Share sheet (preferred — JADENS as share target)
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <PathButton
                label="Share PNG"
                onClick={() => void share(png, "image/png")}
              />
              <PathButton
                label="Share PDF"
                onClick={() => void share(pdf, "application/pdf")}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Path 2 · System print (AirPrint / Default Print)
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <PathButton
                label="Print PNG via browser"
                onClick={() => printInTab(png)}
              />
              <PathButton
                label="Print PDF via browser"
                onClick={() => printInTab(pdf)}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Path 3 · Download → open in JADENS
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <DownloadLink
                href={png.url}
                download={png.filename}
                label="Download PNG"
              />
              <DownloadLink
                href={pdf.url}
                download={pdf.filename}
                label="Download PDF"
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Preview · Current label (ULID {png.ulid.slice(-6)})
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={png.url}
              alt="Generated test label"
              className="mx-auto max-w-xs rounded border border-slate-200"
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

function PathButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

function DownloadLink({
  href,
  download,
  label,
}: {
  href: string;
  download: string;
  label: string;
}): React.ReactElement {
  return (
    <a
      href={href}
      download={download}
      className="flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {label}
    </a>
  );
}
