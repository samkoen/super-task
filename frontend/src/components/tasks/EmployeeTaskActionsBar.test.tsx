import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeTaskActionsBar, { ReadinessLine } from "./EmployeeTaskActionsBar";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { PendingMedia } from "../../utils/pendingMedia";

const reqs: CompletionRequirement[] = [
  { kind: "photo", title: "א" },
  { kind: "photo", title: "ב" },
];
const kept: PendingMedia = { file: null, previewUrl: "", capturedAt: "", keptUrl: "/a.jpg" };

describe("ReadinessLine", () => {
  it("says how many steps are left", () => {
    render(<ReadinessLine requirements={reqs} slots={[kept, null]} slotsFilled={false} />);
    expect(screen.getByText(he.captureRemaining(1))).toBeTruthy();
    expect(screen.getByText(he.completionFillSlotsHint)).toBeTruthy();
  });

  it("says everything is ready once all steps are filled", () => {
    render(<ReadinessLine requirements={reqs} slots={[kept, kept]} slotsFilled />);
    expect(screen.getByText(he.captureAllReady)).toBeTruthy();
    expect(screen.queryByText(he.completionFillSlotsHint)).toBeNull();
  });

  it("does not claim 0 steps left when a filled video is still too short", () => {
    render(<ReadinessLine requirements={reqs} slots={[kept, kept]} slotsFilled={false} />);
    expect(screen.queryByText(he.captureRemaining(0))).toBeNull();
    expect(screen.queryByText(he.captureAllReady)).toBeNull();
    expect(screen.getByText(he.completionFillSlotsHint)).toBeTruthy();
  });

  it("stays out of the way for a task without requirements", () => {
    const { container } = render(<ReadinessLine requirements={[]} slots={[]} slotsFilled />);
    expect(container.firstChild).toBeNull();
  });
});

describe("EmployeeTaskActionsBar", () => {
  it("shows the progress line above the finish button and submits on tap", () => {
    const onSubmit = vi.fn();
    render(
      <EmployeeTaskActionsBar
        status="in_progress"
        requirements={reqs}
        capture={{ slots: [kept, kept], onSubmit, canSubmit: true, slotsFilled: true, saving: false }}
        onClose={vi.fn()}
        starting={false}
      />,
    );
    expect(screen.getByTestId("readiness-line").getAttribute("data-ready")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: he.markDone }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("offers a plain close button when the task cannot be done any more", () => {
    const onClose = vi.fn();
    render(
      <EmployeeTaskActionsBar
        status="pending_review"
        requirements={[]}
        onDoTask={vi.fn()}
        onClose={onClose}
        starting={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("starts the task from the same big button when there is no capture yet", () => {
    const onDoTask = vi.fn();
    render(
      <EmployeeTaskActionsBar status="pending" requirements={[]} onDoTask={onDoTask} onClose={vi.fn()} starting={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.doTask }));
    expect(onDoTask).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: he.close })).toBeNull();
  });
});
