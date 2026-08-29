import { describe, expect, it } from "vitest";
import { loadSeenAlertIds, rememberAlertIds } from "./seenChatAlerts";

describe("seenChatAlerts", () => {
  it("starts empty then remembers ids for the session", () => {
    sessionStorage.clear();
    expect(loadSeenAlertIds().size).toBe(0);
    rememberAlertIds(["a", "b"]);
    expect([...loadSeenAlertIds()]).toEqual(["a", "b"]);
  });

  it("ignores a broken stored value", () => {
    sessionStorage.setItem("super:seen-chat-alerts", "{");
    expect(loadSeenAlertIds().size).toBe(0);
  });
});
