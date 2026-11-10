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
  it("shows the real duration and sends on confirm", () => {
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

  it("offers no trimming control", () => {
    renderReview();
    expect(screen.queryByLabelText(/trim|חיתוך|גזירה/i)).toBeNull();
  });
});
