import { describe, expect, it } from "vitest";
import { claimNeedsConfirm } from "./galleryEmployeeClaim";

describe("claimNeedsConfirm", () => {
  it("asks when an open copy already exists", () => {
    expect(claimNeedsConfirm({ has_open: true })).toBe(true);
  });

  it("skips confirm for a free recipe", () => {
    expect(claimNeedsConfirm({ has_open: false })).toBe(false);
    expect(claimNeedsConfirm({})).toBe(false);
  });
});
