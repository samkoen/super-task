import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { flowToastContent, remainingAfter } from "./flowToast";

describe("flowToastContent", () => {
  it("says the card is kept and how many cards remain", () => {
    const c = flowToastContent({ kind: "kept", remaining: 2 });
    expect(c.title).toBe(he.flowToastKept);
    expect(c.subtitle).toBe(he.flowToastRemaining(2));
    expect(c.tone).toBe("success");
  });

  it("uses the singular for the last remaining card", () => {
    expect(flowToastContent({ kind: "kept", remaining: 1 }).subtitle).toBe(he.flowToastRemaining(1));
    expect(he.flowToastRemaining(1)).not.toBe(he.flowToastRemaining(2));
  });

  it("announces that everything is ready to send when nothing remains", () => {
    expect(flowToastContent({ kind: "kept", remaining: 0 }).subtitle).toBe(he.flowToastAllReady);
  });

  it("flags a failure", () => {
    expect(flowToastContent({ kind: "failed", remaining: 1 }).tone).toBe("error");
  });
});

describe("remainingAfter", () => {
  it("counts the cards still to confirm, ignoring the one just confirmed", () => {
    expect(remainingAfter(["idle", "idle", "ready"], 0)).toBe(1);
  });

  it("is zero when every other card is already confirmed or sent", () => {
    expect(remainingAfter(["sent", "ready", "queued", "uploading"], 3)).toBe(0);
  });

  it("counts failed and filmed cards as still open", () => {
    expect(remainingAfter(["failed", "filmed", "idle"], 2)).toBe(2);
  });
});
