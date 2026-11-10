import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FlowSummary from "./FlowSummary";
import { he } from "../../i18n/he";
import type { SlotUiState } from "../../utils/slotUploadState";

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "video" as const, title: "מקרר ריק" },
];
const sent: SlotUiState = { status: "sent", kind: "video", sentAt: "2026-11-09T06:43:00" };
const queued: SlotUiState = { status: "queued", kind: "video" };
const ready: SlotUiState = { status: "ready", kind: "video" };

function renderSummary(states: SlotUiState[], extra: Partial<Parameters<typeof FlowSummary>[0]> = {}) {
  const handlers = { onSend: vi.fn(), onContinue: vi.fn() };
  render(<FlowSummary shiftOpening requirements={reqs} states={states} sending={false} {...handlers} {...extra} />);
  return handlers;
}

describe("FlowSummary", () => {
  it("before sending: the button says אישור ושליחה and triggers the upload", () => {
    const { onSend, onContinue } = renderSummary([ready, ready]);
    const button = screen.getByTestId("flow-summary-send");
    expect(button.textContent).toBe(he.flowSummarySend);
    expect(he.flowSummarySend).toBe("אישור ושליחה");
    expect(screen.getByTestId("flow-summary-title").textContent).toBe(he.flowSummaryTitleReady);
    expect(screen.getByText(he.flowSummarySubtitleReady(2, 2))).toBeTruthy();
    fireEvent.click(button);
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.queryByTestId("flow-summary-continue")).toBeNull();
  });

  it("lists every card with its ready status before sending", () => {
    renderSummary([ready, ready]);
    const rows = screen.getAllByTestId("flow-summary-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute("data-sent")).toBe("false");
    expect(rows[0].textContent).toContain(he.flowTabReady);
  });

  it("while sending: the button is blocked", () => {
    renderSummary([ready, ready], { sending: true });
    const button = screen.getByTestId("flow-summary-send") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe(he.flowSummarySending);
  });

  it("after sending a shift opening: shows the sent times and goes to the daily tasks", () => {
    const { onContinue, onSend } = renderSummary([sent, sent]);
    expect(screen.getByTestId("flow-summary-title").textContent).toBe(he.flowSummaryTitleOpen);
    expect(screen.getByTestId("flow-summary-continue").textContent).toBe(he.flowSummaryStartDay);
    expect(screen.queryByTestId("flow-summary-send")).toBeNull();
    expect(screen.queryByTestId("flow-summary-pending")).toBeNull();
    fireEvent.click(screen.getByTestId("flow-summary-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("after sending an ordinary task: title and button speak of the task", () => {
    renderSummary([sent, sent], { shiftOpening: false });
    expect(screen.getByTestId("flow-summary-title").textContent).toBe(he.flowSummaryTitleTask);
    expect(screen.getByTestId("flow-summary-continue").textContent).toBe(he.flowSummaryBack);
  });

  it("a video waiting for the network is shown as pending once the send was triggered", () => {
    renderSummary([sent, queued]);
    const rows = screen.getAllByTestId("flow-summary-row");
    expect(rows[1].getAttribute("data-sent")).toBe("false");
    expect(rows[1].textContent).toContain(he.flowTabWaiting);
    expect(screen.getByTestId("flow-summary-pending")).toBeTruthy();
    expect(screen.getByText(he.flowSummarySubtitle(1, 2))).toBeTruthy();
  });

  it("a refused card brings back the send button so it can be retried", () => {
    renderSummary([sent, { status: "failed", kind: "video" }]);
    expect(screen.getByTestId("flow-summary-send")).toBeTruthy();
  });
});
