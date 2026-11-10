import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FlowReview from "./FlowReview";
import { he } from "../../i18n/he";

function renderReview(extra: Partial<Parameters<typeof FlowReview>[0]> = {}) {
  const onConfirm = vi.fn();
  const onRetake = vi.fn();
  render(
    <FlowReview
      open
      title="גיבוי"
      previewUrl="blob:x"
      durationSeconds={12}
      minSeconds={10}
      onConfirm={onConfirm}
      onRetake={onRetake}
      {...extra}
    />,
  );
  return { onConfirm, onRetake };
}

describe("FlowReview", () => {
  it("shows the real duration and calls onConfirm (nothing is sent at this step)", () => {
    const { onConfirm } = renderReview();
    expect(screen.getByTestId("flow-review-length").textContent).toContain(he.flowReviewLengthOk(12));
    fireEvent.click(screen.getByTestId("flow-review-confirm"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("blocks sending when the video is shorter than the minimum, retake stays available", () => {
    const { onConfirm, onRetake } = renderReview({ durationSeconds: 3 });
    expect(screen.getByTestId("flow-review-length").getAttribute("data-ok")).toBe("false");
    const confirm = screen.getByTestId("flow-review-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("flow-review-retake"));
    expect(onRetake).toHaveBeenCalled();
  });

  it("shows the measured lighting and the branch/time of the shot, without blocking", () => {
    const { onConfirm } = renderReview({ lightOk: false, branch: "12", capturedAt: new Date(2026, 10, 10, 9, 5).toISOString() });
    expect(screen.getByTestId("flow-review-light").textContent).toContain(he.flowReviewLightLow);
    expect(screen.getByTestId("flow-review-shot").textContent).toContain("12");
    expect(screen.getByTestId("flow-review-shot").textContent).toContain("09:05");
    fireEvent.click(screen.getByTestId("flow-review-confirm"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("hides the lighting row when it was not measured", () => {
    renderReview({ lightOk: null });
    expect(screen.queryByTestId("flow-review-light")).toBeNull();
  });

  it("offers no trimming control", () => {
    renderReview();
    expect(screen.queryByLabelText(/trim|חיתוך|גזירה/i)).toBeNull();
  });
});
