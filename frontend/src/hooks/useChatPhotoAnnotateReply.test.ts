import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useChatPhotoAnnotateReply } from "./useChatPhotoAnnotateReply";

describe("useChatPhotoAnnotateReply", () => {
  it("opens a source photo then closes after send", async () => {
    const sendPhoto = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useChatPhotoAnnotateReply(sendPhoto));
    act(() => result.current.start("/uploads/p.jpg"));
    expect(result.current.photoUrl).toBe("/uploads/p.jpg");
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    await act(async () => {
      await result.current.submit(file);
    });
    expect(sendPhoto).toHaveBeenCalledWith(file);
    expect(result.current.photoUrl).toBeNull();
  });
});
