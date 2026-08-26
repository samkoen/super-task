import { describe, expect, it } from "vitest";
import { shouldRefreshDirectChat } from "./useDirectChatLiveSync";

describe("shouldRefreshDirectChat", () => {
  it("ignores other conversations and sse handshake", () => {
    expect(shouldRefreshDirectChat({ type: "sse_connected" }, "c1")).toBe(false);
    expect(shouldRefreshDirectChat({ type: "direct_message", conversation_id: "c2" }, "c1")).toBe(
      false,
    );
    expect(shouldRefreshDirectChat({ type: "direct_message", conversation_id: "c1" }, "c1")).toBe(
      true,
    );
    expect(shouldRefreshDirectChat({ kind: "direct_message" }, null)).toBe(true);
  });
});
