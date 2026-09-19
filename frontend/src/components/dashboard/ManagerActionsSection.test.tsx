import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerActionsSection from "./ManagerActionsSection";
import { he } from "../../i18n/he";
import type { DirectChatCard } from "../../services/directChatService";

vi.mock("./ActionRequiredCarousel", () => ({
  default: ({ mode }: { mode: string }) => <div>{mode}-carousel</div>,
}));

function chat(): DirectChatCard {
  return {
    id: "c1",
    kind: "down",
    counterpart_user_id: "e1",
    counterpart_name: "ראובן",
    counterpart_role: "employee",
    last_preview: "שאלה",
    last_at: "2026-09-19T10:00:00+03:00",
    unread_count: 2,
  };
}

describe("ManagerActionsSection", () => {
  it("shows empty copy when nothing is pending", () => {
    render(
      <ManagerActionsSection
        queues={{ completed: [], in_progress: [], pending_review: [], upcoming: [] }}
        chats={[]}
        onReviewTask={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    );
    expect(screen.getByText(he.dashboardActionsTitle)).toBeTruthy();
    expect(screen.getByText(he.dashboardActionsEmpty)).toBeTruthy();
  });

  it("lists unread clali chats before task carousels", () => {
    render(
      <ManagerActionsSection
        queues={{ completed: [], in_progress: [], pending_review: [], upcoming: [] }}
        chats={[chat()]}
        onReviewTask={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    );
    expect(screen.getByText("ראובן")).toBeTruthy();
    expect(screen.getByRole("button", { name: he.dashboardDirectChatReply })).toBeTruthy();
  });
});
