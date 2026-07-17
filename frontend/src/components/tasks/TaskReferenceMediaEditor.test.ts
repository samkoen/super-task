import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveTaskReferenceMedia } from "./TaskReferenceMediaEditor";

vi.mock("../../services/taskService", () => ({
  taskService: {
    uploadPhoto: vi.fn(async () => ({ url: "https://blob.example/photo.jpg" })),
    uploadVideo: vi.fn(async () => ({ url: "https://blob.example/video.mp4" })),
  },
}));

import { taskService } from "../../services/taskService";

describe("resolveTaskReferenceMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads pending photo only at resolve time", async () => {
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    const resolved = await resolveTaskReferenceMedia({
      reference_photo_url: "blob:http://localhost/1",
      reference_video_url: "",
      reference_audio_url: "",
      pending_photo: file,
    });
    expect(taskService.uploadPhoto).toHaveBeenCalledWith(file);
    expect(resolved.reference_photo_url).toBe("https://blob.example/photo.jpg");
  });

  it("keeps already remote URLs without re-upload", async () => {
    const resolved = await resolveTaskReferenceMedia({
      reference_photo_url: "https://blob.example/existing.jpg",
      reference_video_url: "",
      reference_audio_url: "/uploads/task_audio/a.webm",
    });
    expect(taskService.uploadPhoto).not.toHaveBeenCalled();
    expect(resolved.reference_photo_url).toBe("https://blob.example/existing.jpg");
    expect(resolved.reference_audio_url).toBe("/uploads/task_audio/a.webm");
  });
});
