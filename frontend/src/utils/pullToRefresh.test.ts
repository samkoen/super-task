import { describe, expect, it, vi } from "vitest";
import {
  ancestorBlocksPull,
  bindPullToRefresh,
  isPullFromField,
  pullDeltaFromTouch,
  pullIndicatorOffset,
  shouldReleasePullRefresh,
  PULL_REFRESH_THRESHOLD_PX,
} from "./pullToRefresh";

describe("pullToRefresh helpers", () => {
  it("blocks a pull that starts on a text field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    expect(isPullFromField(input)).toBe(true);
    expect(isPullFromField(document.createElement("div"))).toBe(false);
    input.remove();
  });

  it("blocks when an ancestor is scrolled", () => {
    const scroller = document.createElement("div");
    const child = document.createElement("span");
    scroller.appendChild(child);
    document.body.appendChild(scroller);
    scroller.scrollTop = 40;
    expect(ancestorBlocksPull(child)).toBe(true);
    scroller.scrollTop = 0;
    expect(ancestorBlocksPull(child)).toBe(false);
    scroller.remove();
  });

  it("computes downward delta and the release threshold", () => {
    expect(pullDeltaFromTouch(10, 40, false)).toBe(30);
    expect(pullDeltaFromTouch(10, 4, false)).toBe(0);
    expect(pullDeltaFromTouch(10, 80, true)).toBe(0);
    expect(shouldReleasePullRefresh(PULL_REFRESH_THRESHOLD_PX)).toBe(true);
    expect(shouldReleasePullRefresh(PULL_REFRESH_THRESHOLD_PX - 1)).toBe(false);
    expect(pullIndicatorOffset(0, true)).toBe(48);
    expect(pullIndicatorOffset(100, false)).toBe(45);
  });

  it("fires onRelease after a long pull at the top", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const onRelease = vi.fn();
    const unbind = bindPullToRefresh(el, {
      getRefreshing: () => false,
      setDelta: vi.fn(),
      onRelease,
    });
    el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(8)] }));
    el.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [touch(90)] }));
    el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
    expect(onRelease).toHaveBeenCalledTimes(1);
    unbind();
    el.remove();
  });

  it("does not refresh a short pull", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const onRelease = vi.fn();
    const unbind = bindPullToRefresh(el, {
      getRefreshing: () => false,
      setDelta: vi.fn(),
      onRelease,
    });
    el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(8)] }));
    el.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [touch(20)] }));
    el.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
    expect(onRelease).not.toHaveBeenCalled();
    unbind();
    el.remove();
  });
});

function touch(clientY: number): Touch {
  return { clientY } as Touch;
}
