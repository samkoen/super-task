import { describe, expect, it } from "vitest";
import { taskChatVisualAttachments } from "./taskChatVisualMedia";

describe("taskChatVisualAttachments", () => {
  it("keeps the photos and videos taken for the task", () => {
    const items = taskChatVisualAttachments({
      photo_path: "/p.jpg",
      video_path: "/v.mp4",
      audio_path: "/a.webm",
    });
    expect(items.map((item) => item.kind)).toEqual(["photo", "video"]);
  });

  it("returns nothing when the task has only audio", () => {
    expect(taskChatVisualAttachments({ audio_path: "/a.webm" })).toEqual([]);
    expect(taskChatVisualAttachments(null)).toEqual([]);
  });
});
