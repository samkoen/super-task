import { describe, expect, it } from "vitest";
import { avatarSourceRect } from "./cropAvatar";

describe("avatarSourceRect", () => {
  it("uses the full square image at zoom 1 without pan", () => {
    expect(avatarSourceRect(400, 400, { panX: 0, panY: 0, zoom: 1 })).toEqual({
      sx: 0,
      sy: 0,
      sw: 400,
      sh: 400,
    });
  });

  it("crops a centered square from a wide photo", () => {
    const rect = avatarSourceRect(800, 400, { panX: 0, panY: 0, zoom: 1 });
    expect(rect.sw).toBe(400);
    expect(rect.sh).toBe(400);
    expect(rect.sx).toBe(200);
    expect(rect.sy).toBe(0);
  });

  it("zooms in on the center", () => {
    const rect = avatarSourceRect(400, 400, { panX: 0, panY: 0, zoom: 2 });
    expect(rect.sw).toBe(200);
    expect(rect.sx).toBe(100);
    expect(rect.sy).toBe(100);
  });

  it("pans within the zoomed square", () => {
    const left = avatarSourceRect(400, 400, { panX: -1, panY: 0, zoom: 2 });
    const right = avatarSourceRect(400, 400, { panX: 1, panY: 0, zoom: 2 });
    expect(left.sx).toBe(0);
    expect(right.sx).toBe(200);
  });
});
