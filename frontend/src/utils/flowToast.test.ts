import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { flowToastContent, remainingAfter } from "./flowToast";

describe("flowToastContent", () => {
  it("says how many cards remain after a send", () => {
    const c = flowToastContent({ kind: "sent", remaining: 2 });
    expect(c.title).toBe(he.flowToastSent);
    expect(c.subtitle).toBe(he.flowToastRemaining(2));
    expect(c.tone).toBe("success");
  });

  it("uses the singular for the last remaining card", () => {
    expect(flowToastContent({ kind: "sent", remaining: 1 }).subtitle).toBe(he.flowToastRemaining(1));
    expect(he.flowToastRemaining(1)).not.toBe(he.flowToastRemaining(2));
  });

  it("confirms the whole task when nothing remains", () => {
    expect(flowToastContent({ kind: "sent", remaining: 0 }).subtitle).toBe(he.flowToastTaskDone);
    expect(flowToastContent({ kind: "taskDone", remaining: 3 }).subtitle).toBe(he.flowToastTaskDone);
  });

  it("explains that an offline video is saved on the device", () => {
    const c = flowToastContent({ kind: "saved", remaining: 1 });
    expect(c.title).toBe(he.flowToastSavedOnDevice);
    expect(c.subtitle).toBe(he.flowToastSavedHint);
    expect(c.tone).toBe("pending");
  });

  it("flags a failure", () => {
    expect(flowToastContent({ kind: "failed", remaining: 1 }).tone).toBe("error");
  });
});

describe("remainingAfter", () => {
  it("counts the cards still to hand over, ignoring the one just sent", () => {
    expect(remainingAfter(["idle", "idle", "sent"], 0)).toBe(1);
  });

  it("is zero when every other card is already handed over", () => {
    expect(remainingAfter(["sent", "queued", "uploading"], 2)).toBe(0);
  });

  it("counts failed and filmed cards as still open", () => {
    expect(remainingAfter(["failed", "filmed", "idle"], 2)).toBe(2);
  });
});
