import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FlowSentDialog from "./FlowSentDialog";
import { he } from "../../i18n/he";

describe("FlowSentDialog (screen 11)", () => {
  it("confirms the send with the number of videos and goes to the daily tasks", () => {
    const onContinue = vi.fn();
    render(<FlowSentDialog open count={3} onContinue={onContinue} />);
    expect(screen.getByText(he.flowSentTitle)).toBeTruthy();
    expect(screen.getByTestId("flow-sent-body").textContent).toBe(he.flowSentBody(3));
    expect(screen.getByTestId("flow-sent-continue").textContent).toBe(he.flowSentCta);
    fireEvent.click(screen.getByTestId("flow-sent-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("speaks of a single video in the singular", () => {
    render(<FlowSentDialog open count={1} onContinue={vi.fn()} />);
    expect(screen.getByTestId("flow-sent-body").textContent).toBe(he.flowSentBody(1));
  });

  it("uses the text without a number when no video was sent (only reasons)", () => {
    render(<FlowSentDialog open count={0} onContinue={vi.fn()} />);
    expect(screen.getByTestId("flow-sent-body").textContent).toBe(he.flowSentBodyNone);
  });

  it("renders nothing while closed", () => {
    render(<FlowSentDialog open={false} count={2} onContinue={vi.fn()} />);
    expect(screen.queryByTestId("flow-sent-continue")).toBeNull();
  });
});
