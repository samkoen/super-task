import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../services/api";
import { he } from "../i18n/he";
import { chatErrorMessage, uploadChatMedia } from "./chatTransport";

describe("chatTransport helpers", () => {
  it("maps API errors and falls back to the generic message", () => {
    expect(chatErrorMessage(new ApiError("אין הרשאה", 403))).toBe("אין הרשאה");
    expect(chatErrorMessage(new Error("boom"))).toBe(he.errorGeneric);
  });

  it("uploads each media kind onto the matching payload field", async () => {
    const uploader = {
      uploadPhoto: vi.fn().mockResolvedValue({ url: "/p.jpg" }),
      uploadVideo: vi.fn().mockResolvedValue({ url: "/v.webm" }),
      uploadAudio: vi.fn().mockResolvedValue({ url: "/a.webm" }),
      uploadFile: vi.fn().mockResolvedValue({ url: "/f.pdf", filename: "m.bin" }),
    };
    const file = new File(["x"], "m.bin");
    expect(await uploadChatMedia(uploader, file, "photo")).toEqual({ photo_url: "/p.jpg" });
    expect(await uploadChatMedia(uploader, file, "video")).toEqual({ video_url: "/v.webm" });
    expect(await uploadChatMedia(uploader, file, "audio")).toEqual({ audio_url: "/a.webm" });
    expect(await uploadChatMedia(uploader, file, "file")).toEqual({
      file_url: "/f.pdf",
      file_name: "m.bin",
    });
  });
});
