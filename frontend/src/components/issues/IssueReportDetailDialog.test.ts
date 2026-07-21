import { describe, expect, it, vi } from "vitest";
import { issueReportMediaSources } from "./IssueReportDetailDialog";

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null | undefined) => (path ? `proxied:${path}` : null),
}));

describe("issueReportMediaSources", () => {
  it("resolves photo video and audio via mediaUrl proxy", () => {
    const src = issueReportMediaSources({
      photo_url: "https://x.private.blob.vercel-storage.com/a.jpg",
      video_url: "/uploads/v.mp4",
      audio_url: null,
    });
    expect(src.photoSrc).toBe("proxied:https://x.private.blob.vercel-storage.com/a.jpg");
    expect(src.videoSrc).toBe("proxied:/uploads/v.mp4");
    expect(src.audioSrc).toBeNull();
  });
});
