import { describe, expect, it } from "vitest";
import { avatarPreviewLayout, avatarSourceRect } from "./cropAvatar";

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

describe("avatarPreviewLayout", () => {
  it("fills the square viewport at zoom 1 without pan", () => {
    expect(avatarPreviewLayout(400, 400, { panX: 0, panY: 0, zoom: 1 })).toEqual({
      widthPct: 100,
      heightPct: 100,
      leftPct: 0,
      topPct: 0,
    });
  });

  it("matches export pan to the image edge when zoomed", () => {
    const left = avatarPreviewLayout(400, 400, { panX: -1, panY: 0, zoom: 2 });
    const right = avatarPreviewLayout(400, 400, { panX: 1, panY: 0, zoom: 2 });
    expect(left.leftPct).toBe(0);
    expect(right.leftPct).toBe(-100);
    expect(left.widthPct).toBe(200);
  });

  it("shows the same centered square as export on a wide photo", () => {
    const layout = avatarPreviewLayout(800, 400, { panX: 0, panY: 0, zoom: 1 });
    expect(layout.widthPct).toBe(200);
    expect(layout.heightPct).toBe(100);
    expect(layout.leftPct).toBe(-50);
    expect(layout.topPct).toBe(0);
  });
});
