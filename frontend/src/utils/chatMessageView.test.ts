import { describe, expect, it } from "vitest";
import {
  chatMessageListSx,
  chatMessageText,
  chatMessageTranscript,
  isEmployeeChatMessage,
  type ChatMessageView,
} from "./chatMessageView";

function msg(extra: Partial<ChatMessageView> = {}): ChatMessageView {
  return {
    id: "m1",
    sender_user_id: "u1",
    body: "שלום",
    created_at: "2026-09-03T10:00:00Z",
    ...extra,
  };
}

describe("chatMessageView", () => {
  it("prefers the displayed translation over the raw body", () => {
    expect(chatMessageText(msg({ body: "hello", display_body: "שלום" }))).toBe("שלום");
    expect(chatMessageText(msg({ body: "  ", display_body: null }))).toBe("");
  });

  it("exposes a transcript only when there is no text", () => {
    expect(chatMessageTranscript(msg({ audio_transcript: "מולה" }))).toBeUndefined();
    expect(
      chatMessageTranscript(msg({ body: "", display_audio_transcript: "מולה" })),
    ).toBe("מולה");
  });

  it("treats employee role or unknown incoming sender as employee", () => {
    expect(isEmployeeChatMessage(msg({ sender_role: "employee" }), true)).toBe(true);
    expect(isEmployeeChatMessage(msg({ sender_role: null }), false)).toBe(true);
    expect(isEmployeeChatMessage(msg({ sender_role: "branch_manager" }), false)).toBe(false);
  });

  it("sizes the fill thread taller than the bounded task panel", () => {
    expect(chatMessageListSx("fill", false).flex).toBe(1);
    expect(chatMessageListSx("bounded", true).maxHeight).toBe(220);
    expect(chatMessageListSx("bounded", false).maxHeight).toBe(320);
  });
});
