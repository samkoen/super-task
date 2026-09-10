import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { clearChatMediaPreviews, rememberChatMediaPreview } from "../utils/chatMediaPreview";
import { useResolvedMediaSrc } from "./useResolvedMediaSrc";

vi.mock("../utils/fetchMediaBlob", () => ({
  fetchMediaBlobWithRetry: vi.fn(),
}));

vi.mock("../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null | undefined) => (path ? `/proxy?src=${path}` : null),
}));

import { fetchMediaBlobWithRetry } from "../utils/fetchMediaBlob";

function stubObjectUrl(value = "blob:test") {
  const create = vi.fn(() => value);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  return create;
}

describe("useResolvedMediaSrc", () => {
  afterEach(() => {
    clearChatMediaPreviews();
    vi.mocked(fetchMediaBlobWithRetry).mockReset();
  });

  it("uses the local send preview immediately", () => {
    stubObjectUrl("blob:local-photo");
    rememberChatMediaPreview(
      { photo_url: "/uploads/p.jpg" },
      new File(["x"], "p.jpg", { type: "image/jpeg" }),
    );
    const { result } = renderHook(() => useResolvedMediaSrc("/uploads/p.jpg"));
    expect(result.current.src).toBe("blob:local-photo");
    expect(result.current.loading).toBe(false);
  });

  it("eagerly fetches a remote file with the session instead of painting the proxy url", async () => {
    const blob = new Blob(["vid"], { type: "video/mp4" });
    vi.mocked(fetchMediaBlobWithRetry).mockResolvedValue(blob);
    stubObjectUrl("blob:kept-video");
    const { result } = renderHook(() => useResolvedMediaSrc("/uploads/v2.mp4", true));
    expect(result.current.src).toBeNull();
    await waitFor(() => expect(result.current.src).toBe("blob:kept-video"));
    expect(fetchMediaBlobWithRetry).toHaveBeenCalledWith("/uploads/v2.mp4");
  });

  it("starts with the proxied url then swaps after a failed first paint", async () => {
    const blob = new Blob(["img"], { type: "image/jpeg" });
    vi.mocked(fetchMediaBlobWithRetry).mockResolvedValue(blob);
    const createObjectURL = stubObjectUrl("blob:remote-photo");
    const { result } = renderHook(() => useResolvedMediaSrc("/uploads/p.jpg"));
    expect(result.current.src).toBe("/proxy?src=/uploads/p.jpg");
    await act(async () => {
      result.current.onError();
    });
    await waitFor(() => expect(result.current.src).toBe("blob:remote-photo"));
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("does not retry when the first paint already used a fetched blob", async () => {
    vi.mocked(fetchMediaBlobWithRetry).mockResolvedValue(new Blob(["img"]));
    stubObjectUrl("blob:remote-photo");
    const { result } = renderHook(() => useResolvedMediaSrc("/uploads/p.jpg"));
    await act(async () => {
      result.current.onError();
    });
    await waitFor(() => expect(result.current.src).toBe("blob:remote-photo"));
    await act(async () => {
      result.current.onError();
    });
    expect(fetchMediaBlobWithRetry).toHaveBeenCalledTimes(1);
    expect(result.current.failed).toBe(true);
  });

  it("marks the media as failed when every retry is exhausted", async () => {
    vi.mocked(fetchMediaBlobWithRetry).mockRejectedValue(new Error("media fetch failed: 404"));
    const { result } = renderHook(() => useResolvedMediaSrc("/uploads/p.jpg"));
    await act(async () => {
      result.current.onError();
    });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.src).toBe("/proxy?src=/uploads/p.jpg");
  });
});
