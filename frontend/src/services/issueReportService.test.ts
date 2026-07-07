import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("./api", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

import { issueReportService } from "./issueReportService";

describe("issueReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createReport posts to /issue-reports", async () => {
    mockPost.mockResolvedValue({
      data: { report: { id: "r1", text: "תקלה", reporter_user_id: "u1", branch_id: "b1", photo_url: null, video_url: null, audio_url: null, created_at: "2026-01-01" } },
    });

    const result = await issueReportService.createReport({ text: "תקלה" });

    expect(mockPost).toHaveBeenCalledWith("/issue-reports", { text: "תקלה" });
    expect(result.id).toBe("r1");
  });

  it("getReport fetches by id", async () => {
    mockGet.mockResolvedValue({
      data: { report: { id: "r1", text: "בעיה", reporter_user_id: "u1", branch_id: "b1", photo_url: null, video_url: null, audio_url: null, created_at: "2026-01-01" } },
    });

    const result = await issueReportService.getReport("r1");

    expect(mockGet).toHaveBeenCalledWith("/issue-reports/r1");
    expect(result.text).toBe("בעיה");
  });

  it("uploadPhoto posts multipart to upload endpoint", async () => {
    mockPost.mockResolvedValue({ data: { url: "/uploads/issue_photos/x.jpg", kind: "photo" } });
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });

    const result = await issueReportService.uploadPhoto(file);

    expect(mockPost).toHaveBeenCalledWith(
      "/issue-reports/upload-photo",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    expect(result.url).toContain("issue_photos");
  });
});
