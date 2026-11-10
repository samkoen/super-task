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

describe("FlowSummary", () => {
  it("lists every card with its status and goes straight to the daily tasks", () => {
    const onContinue = vi.fn();
    render(<FlowSummary title={he.flowSummaryTitleOpen} requirements={reqs} states={[sent, sent]} onContinue={onContinue} />);
    expect(screen.getAllByTestId("flow-summary-row")).toHaveLength(2);
    expect(screen.queryByTestId("flow-summary-pending")).toBeNull();
    fireEvent.click(screen.getByTestId("flow-summary-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("is still shown when a video waits for the network, with its pending status", () => {
    render(<FlowSummary title={he.flowSummaryTitleOpen} requirements={reqs} states={[sent, queued]} onContinue={vi.fn()} />);
    const rows = screen.getAllByTestId("flow-summary-row");
    expect(rows[1].getAttribute("data-sent")).toBe("false");
    expect(rows[1].textContent).toContain(he.flowTabWaiting);
    expect(screen.getByTestId("flow-summary-pending")).toBeTruthy();
    expect(screen.getByText(he.flowSummarySubtitle(1, 2))).toBeTruthy();
  });

  it("uses the given title and button label", () => {
    render(<FlowSummary title="סיום" requirements={[reqs[0]]} states={[sent]} continueLabel="המשך" onContinue={vi.fn()} />);
    expect(screen.getByText("סיום")).toBeTruthy();
    expect(screen.getByTestId("flow-summary-continue").textContent).toBe("המשך");
  });
});
