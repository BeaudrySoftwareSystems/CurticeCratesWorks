// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({
  upload: mocks.upload,
}));

import { PhotoCapture } from "@/components/intake/PhotoCapture";

function makeImageFile(
  name: string,
  type: string,
  size: number = 1024,
): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

describe("PhotoCapture", () => {
  it("renders a hidden file input with capture='environment' for the native camera", () => {
    const { container } = render(<PhotoCapture itemId="item-1" />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute("accept")).toBe("image/*");
    expect(input?.getAttribute("capture")).toBe("environment");
  });

  it("rejects an oversized file before invoking upload", async () => {
    mocks.upload.mockReset();
    const onUploading = vi.fn();
    const { container } = render(
      <PhotoCapture itemId="item-1" onUploadingChange={onUploading} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const huge = makeImageFile(
      "big.jpg",
      "image/jpeg",
      11 * 1024 * 1024, // > MAX_PHOTO_BYTES
    );
    Object.defineProperty(input, "files", {
      value: [huge],
      configurable: true,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects an unsupported MIME type before invoking upload", async () => {
    mocks.upload.mockReset();
    const { container } = render(<PhotoCapture itemId="item-1" />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const svg = makeImageFile("scribble.svg", "image/svg+xml");
    Object.defineProperty(input, "files", {
      value: [svg],
      configurable: true,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/unsupported type/i)).toBeInTheDocument();
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("invokes upload with the server-issued clientPayload on a valid file", async () => {
    mocks.upload.mockResolvedValueOnce({
      pathname: "items/item-1/upload-x-suffixed",
      url: "https://example.public.blob.vercel-storage.com/items/item-1/upload-x-suffixed",
      contentType: "image/jpeg",
    });
    const onUploading = vi.fn();
    const { container } = render(
      <PhotoCapture itemId="item-1" onUploadingChange={onUploading} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const file = makeImageFile("photo.jpg", "image/jpeg", 5_000);
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(mocks.upload).toHaveBeenCalledWith(
        "photo.jpg",
        file,
        expect.objectContaining({
          access: "private",
          handleUploadUrl: "/api/blob/upload",
        }),
      );
    });
    const args = mocks.upload.mock.calls[0]?.[2] as { clientPayload: string };
    expect(JSON.parse(args.clientPayload)).toEqual({
      itemId: "item-1",
      declaredMime: "image/jpeg",
      declaredBytes: 5_000,
    });
    // onUploadingChange should fire true then false.
    expect(onUploading).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(onUploading).toHaveBeenLastCalledWith(false);
    });
  });
});
