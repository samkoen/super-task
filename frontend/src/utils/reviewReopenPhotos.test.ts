import { describe, expect, it, vi, beforeEach } from "vitest";
import { taskService } from "../services/taskService";
import {
  completionPhotoUrls,
  markedPhotoUrls,
  reopenNoteForMarks,
  reopenReviewedTask,
  upsertReviewPhotoMark,
} from "./reviewReopenPhotos";

vi.mock("../services/taskService", () => ({
  taskService: {
    reopen: vi.fn(),
    postMessage: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

const fileA = new File(["a"], "a.jpg", { type: "image/jpeg" });
const fileB = new File(["b"], "b.jpg", { type: "image/jpeg" });

describe("reviewReopenPhotos", () => {
  it("lists only completion photos", () => {
    expect(
      completionPhotoUrls({
        photo_path: "/p.jpg",
        video_path: "/v.mp4",
        audio_path: "/a.webm",
      }),
    ).toEqual(["/p.jpg"]);
    expect(
      completionPhotoUrls({
        completion_attachments: [
          { kind: "photo", url: "/1.jpg" },
          { kind: "video", url: "/2.mp4" },
          { kind: "photo", url: "/3.jpg" },
        ],
      }),
    ).toEqual(["/1.jpg", "/3.jpg"]);
  });

  it("replaces a mark on the same source photo", () => {
    const first = upsertReviewPhotoMark([], { sourceUrl: "/p.jpg", file: fileA });
    const next = upsertReviewPhotoMark(first, { sourceUrl: "/p.jpg", file: fileB });
    expect(next).toHaveLength(1);
    expect(next[0].file).toBe(fileB);
    expect(markedPhotoUrls(next)).toEqual(["/p.jpg"]);
  });

  it("uses the fallback note when the field is empty", () => {
    expect(reopenNoteForMarks("  ", "נא לתקן")).toBe("נא לתקן");
    expect(reopenNoteForMarks("תקן מדף", "נא לתקן")).toBe("תקן מדף");
  });
});

describe("reopenReviewedTask", () => {
  beforeEach(() => {
    vi.mocked(taskService.reopen).mockReset().mockResolvedValue({} as never);
    vi.mocked(taskService.postMessage).mockReset().mockResolvedValue({} as never);
    vi.mocked(taskService.uploadPhoto).mockReset().mockResolvedValue({ url: "/chat.jpg", kind: "photo" });
  });

  it("reopens with the note when no photo was marked", async () => {
    await reopenReviewedTask({
      occurrenceId: "occ-1",
      note: "",
      fallbackNote: "נא לתקן",
      marks: [],
    });
    expect(taskService.reopen).toHaveBeenCalledWith("occ-1", { rejection_note: "נא לתקן" });
    expect(taskService.postMessage).not.toHaveBeenCalled();
  });

  it("sends marked photos in chat and skips the reopen API", async () => {
    await reopenReviewedTask({
      occurrenceId: "occ-1",
      note: "תקן את המדף",
      fallbackNote: "נא לתקן",
      marks: [
        { sourceUrl: "/p1.jpg", file: fileA },
        { sourceUrl: "/p2.jpg", file: fileB },
      ],
    });
    expect(taskService.reopen).not.toHaveBeenCalled();
    expect(taskService.postMessage).toHaveBeenNthCalledWith(1, "occ-1", {
      photo_url: "/chat.jpg",
      body: "תקן את המדף",
    });
    expect(taskService.postMessage).toHaveBeenNthCalledWith(2, "occ-1", {
      photo_url: "/chat.jpg",
      body: undefined,
    });
  });
});
