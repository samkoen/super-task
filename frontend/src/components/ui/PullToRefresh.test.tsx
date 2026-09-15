import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import PullToRefresh, { LivePullToRefresh, pullRefreshLabel } from "./PullToRefresh";
import { MANUAL_REFRESH_TYPE, TASK_CHANGE_EVENT } from "../../constants/events";
import { he } from "../../i18n/he";
import { PULL_REFRESH_THRESHOLD_PX } from "../../utils/pullToRefresh";

describe("PullToRefresh", () => {
  it("renders children in the pull region", () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <p>לוח בקרה</p>
      </PullToRefresh>,
    );
    expect(screen.getByTestId("pull-to-refresh")).toBeTruthy();
    expect(screen.getByText("לוח בקרה")).toBeTruthy();
    expect(screen.getByRole("status", { hidden: true })).toBeTruthy();
  });

  it("labels the spinner for hint, release and loading", () => {
    expect(pullRefreshLabel(0, false)).toBe(he.pullToRefreshHint);
    expect(pullRefreshLabel(PULL_REFRESH_THRESHOLD_PX, false)).toBe(he.pullToRefreshRelease);
    expect(pullRefreshLabel(0, true)).toBe(he.loading);
  });
});

describe("LivePullToRefresh", () => {
  it("dispatches a manual live refresh", async () => {
    const handler = vi.fn();
    window.addEventListener(TASK_CHANGE_EVENT, handler);
    render(
      <LivePullToRefresh>
        <span>x</span>
      </LivePullToRefresh>,
    );
    const region = screen.getByTestId("pull-to-refresh");
    await act(async () => {
      region.dispatchEvent(touchEvent("touchstart", 8));
      region.dispatchEvent(touchEvent("touchmove", 90));
      region.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
    });
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.type).toBe(MANUAL_REFRESH_TYPE);
    window.removeEventListener(TASK_CHANGE_EVENT, handler);
  });
});

function touchEvent(type: string, clientY: number): TouchEvent {
  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: [{ clientY } as Touch],
  });
}
