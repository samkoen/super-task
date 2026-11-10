import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import FlowTaskChat from "./FlowTaskChat";
import { he } from "../../i18n/he";

vi.mock("../tasks/TaskChatDialog", () => ({
  default: ({ open, initialDraft, topSlot }: { open: boolean; initialDraft?: string; topSlot?: ReactNode }) =>
    open ? (
      <div>
        {topSlot}
        <div data-testid="draft">{initialDraft ?? ""}</div>
      </div>
    ) : null,
}));

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "video" as const, title: "מקרר ריק" },
];

function renderChat(initialIndex: number | null, requirements = reqs) {
  render(
    <FlowTaskChat open initialIndex={initialIndex} occurrenceId="o1" title="פתיחה" requirements={requirements} onClose={vi.fn()} />,
  );
}

describe("FlowTaskChat", () => {
  it("pre-writes the question for the subtask of the card the chat was opened from", () => {
    renderChat(1);
    expect(screen.getByTestId("draft").textContent).toBe(he.subtaskQuestionDraft("מקרר ריק"));
  });

  it("lets the employee designate another subtask, or the task in general", () => {
    renderChat(0);
    const choices = screen.getAllByTestId("flow-chat-choice");
    expect(choices.map((c) => c.textContent)).toEqual([he.flowChatGeneral, "גיבוי", "מקרר ריק"]);
    fireEvent.click(choices[2]);
    expect(screen.getByTestId("draft").textContent).toBe(he.subtaskQuestionDraft("מקרר ריק"));
    fireEvent.click(choices[0]);
    expect(screen.getByTestId("draft").textContent).toBe("");
  });

  it("starts on the general choice when opened from the top icon", () => {
    renderChat(null);
    expect(screen.getByTestId("draft").textContent).toBe("");
    expect(screen.getAllByTestId("flow-chat-choice")[0].getAttribute("aria-pressed")).toBe("true");
  });

  it("hides the picker when the task has no subtask", () => {
    renderChat(null, []);
    expect(screen.queryByTestId("flow-chat-picker")).toBeNull();
  });
});
