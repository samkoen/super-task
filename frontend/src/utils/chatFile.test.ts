import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { CHAT_FILE_ACCEPT, chatFileLabel } from "./chatFile";

describe("chatFile", () => {
  it("falls back when the original name is missing", () => {
    expect(chatFileLabel("  דוח.pdf  ")).toBe("דוח.pdf");
    expect(chatFileLabel("")).toBe(he.chatFileFallback);
    expect(chatFileLabel(null)).toBe(he.chatFileFallback);
  });

  it("lists office document extensions for the picker", () => {
    expect(CHAT_FILE_ACCEPT).toContain(".pdf");
    expect(CHAT_FILE_ACCEPT).toContain(".xlsx");
  });
});
