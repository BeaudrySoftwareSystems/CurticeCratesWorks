"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_BYTES } from "@/domain/photo";

/**
 * Camera-first photo upload. `<input type="file" capture="environment">`
 * invokes the native back camera; uploads run via @vercel/blob/client
 * against /api/blob/upload (the sole Route Handler exception). Each
 * upload is independent of the form submit; the parent form's submit
 * stays disabled while any upload is in flight.
 *
 * The photos row is created server-side by `onUploadCompleted` (Unit 6) —
 * by the time `upload()` resolves, the photo is already linked.
 */

export interface UploadedPhoto {
  pathname: string;
  url: string;
}

export interface PhotoCaptureProps {
  itemId: string;
  onUploadingChange?: (uploading: boolean) => void;
}

interface PendingUpload {
  id: string;
  filename: string;
  status: "uploading" | "done" | "error";
  errorMessage?: string;
  result?: UploadedPhoto;
}

export function PhotoCapture({
  itemId,
  onUploadingChange,
}: PhotoCaptureProps): React.ReactElement {
  const [items, setItems] = useState<PendingUpload[]>([]);

  const updateItem = (id: string, patch: Partial<PendingUpload>): void => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (files === null || files.length === 0) {
      return;
    }
    const newOnes: PendingUpload[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      filename: f.name,
      status: "uploading" as const,
    }));
    setItems((prev) => [...prev, ...newOnes]);
    onUploadingChange?.(true);

    await Promise.all(
      newOnes.map(async (pending, idx) => {
        const file = files[idx]!;
        if (file.size > MAX_PHOTO_BYTES) {
          updateItem(pending.id, {
            status: "error",
            errorMessage: `File too large (${formatBytes(file.size)})`,
          });
          return;
        }
        if (
          !(ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)
        ) {
          updateItem(pending.id, {
            status: "error",
            errorMessage: `Unsupported type: ${file.type || "unknown"}`,
          });
          return;
        }
        try {
          const result = await upload(file.name, file, {
            access: "private",
            handleUploadUrl: "/api/blob/upload",
            clientPayload: JSON.stringify({
              itemId,
              declaredMime: file.type,
              declaredBytes: file.size,
            }),
          });
          updateItem(pending.id, {
            status: "done",
            result: { pathname: result.pathname, url: result.url },
          });
        } catch (err) {
          updateItem(pending.id, {
            status: "error",
            errorMessage:
              err instanceof Error ? err.message : "Upload failed",
          });
        }
      }),
    );

    setItems((prev) => {
      const stillUploading = prev.some((it) => it.status === "uploading");
      onUploadingChange?.(stillUploading);
      return prev;
    });
  };

  return (
    <div className="grid gap-3">
      <label
        htmlFor="photo-input"
        className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-edge bg-paper px-4 font-sans text-[14px] font-medium text-driftwood transition-colors hover:border-ember hover:text-ember"
      >
        <span aria-hidden className="text-base">＋</span>
        Take or attach photo
      </label>
      <input
        id="photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {items.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((it) => (
            <li
              key={it.id}
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-hairline bg-paper text-center font-sans text-[11px] text-driftwood"
            >
              {it.status === "done" && it.result !== undefined ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.result.url}
                  alt={it.filename}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : it.status === "uploading" ? (
                <span>Uploading…</span>
              ) : (
                <span className="px-1 text-signal">
                  {it.errorMessage ?? "Failed"}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}
