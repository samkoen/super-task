import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerActionsSection from "./ManagerActionsSection";
import { he } from "../../i18n/he";
import type { DirectChatCard } from "../../services/directChatService";
import type { TaskQueues, TimelineTask } from "../../services/dashboardService";

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

  it("puts finished tasks waiting for approval above טיפול נדרש", () => {
    render(
      <ManagerActionsSection
        queues={queuesWithBoth()}
        chats={[]}
        onReviewTask={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    );
    const reviews = screen.getByText("reviews-carousel");
    const actions = screen.getByText(he.dashboardActionsTitle, { exact: false });
    const questions = screen.getByText("questions-carousel");
    expect(reviews.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actions.compareDocumentPosition(questions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

function queuesWithBoth(): TaskQueues {
  return {
    completed: [],
    in_progress: [],
    upcoming: [],
    pending_review: [reviewTask(), questionTask()],
  };
}

function reviewTask(): TimelineTask {
  return {
    id: "review-1",
    title: "ניקיון",
    status: "pending_review",
    segment: "pending_review",
    due_at: "2026-09-19T10:00:00+03:00",
    started_at: null,
    completed_at: "2026-09-19T11:00:00+03:00",
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: null,
    assignee_name: "עובד",
    task_kind: "ad_hoc",
    media_ready: true,
  };
}

function questionTask(): TimelineTask {
  return {
    ...reviewTask(),
    id: "question-1",
    title: "שאלה",
    status: "awaiting_response",
    segment: "awaiting_response",
    completed_at: null,
  };
}
