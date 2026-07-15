import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("./api", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { aiService } from "./aiService";

describe("aiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStatus fetches /ai/status", async () => {
    mockGet.mockResolvedValue({
      data: {
        available: ["gemini"],
        default: "gemini",
        providers: [],
      },
    });

    const status = await aiService.getStatus();
    expect(mockGet).toHaveBeenCalledWith("/ai/status");
    expect(status.available).toEqual(["gemini"]);
  });

  it("chat posts messages to /ai/chat", async () => {
    mockPost.mockResolvedValue({
      data: { reply: "שלום", provider: "gemini" },
    });

    const payload = {
      messages: [{ role: "user" as const, content: "שלום" }],
      provider: "gemini" as const,
    };
    const result = await aiService.chat(payload);

    expect(mockPost).toHaveBeenCalledWith("/ai/chat", payload, { timeout: 300_000 });
    expect(result.reply).toBe("שלום");
    expect(result.provider).toBe("gemini");
  });

  it("complete posts prompt to /ai/complete", async () => {
    mockPost.mockResolvedValue({
      data: { reply: "תשובה", provider: "opencode" },
    });

    const payload = { prompt: "שאלה", provider: "opencode" as const };
    const result = await aiService.complete(payload);

    expect(mockPost).toHaveBeenCalledWith("/ai/complete", payload, { timeout: 300_000 });
    expect(result.provider).toBe("opencode");
  });

  it("parseTaskFromVoice posts multipart to /ai/task-from-voice", async () => {
    mockPost.mockResolvedValue({
      data: {
        title: "משימה",
        description: "פרטים",
        assignee_user_id: "u1",
        assignee_name: "יוסי",
      },
    });

    const file = new File(["audio"], "voice.webm", { type: "audio/webm" });
    const result = await aiService.parseTaskFromVoice({
      branchId: "b1",
      taskKind: "ad_hoc",
      file,
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/ai/task-from-voice",
      expect.any(FormData),
      expect.objectContaining({ timeout: 300_000 })
    );
    expect(result.title).toBe("משימה");
  });

  it("speakTask posts text to /ai/task-tts as blob", async () => {
    mockPost.mockResolvedValue({ data: new Blob(["audio"], { type: "audio/mpeg" }) });

    const blob = await aiService.speakTask("مرحبا", "ar");

    expect(mockPost).toHaveBeenCalledWith(
      "/ai/task-tts",
      { text: "مرحبا", language: "ar" },
      expect.objectContaining({ timeout: 120_000, responseType: "blob" })
    );
    expect(blob.type).toBe("audio/mpeg");
  });
});
