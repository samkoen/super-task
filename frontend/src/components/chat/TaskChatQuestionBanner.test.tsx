import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { he } from "../../i18n/he";
import type { ChatMessageView } from "../../utils/chatMessageView";
import TaskChatQuestionBanner from "./TaskChatQuestionBanner";

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));

function question(extra: Partial<ChatMessageView> = {}): ChatMessageView {
  return {
    id: "m1",
    sender_user_id: "emp-1",
    sender_role: "employee",
    sender_name: "עובד",
    body: "שאלה",
    created_at: "2026-07-22T10:00:00.000Z",
    ...extra,
  };
}

describe("TaskChatQuestionBanner", () => {
  it("shows the employee question text", () => {
    render(
      <TaskChatQuestionBanner
        message={question()}
        composeEnabled
        onAnnotateReply={vi.fn()}
      />,
    );
    expect(screen.getByText(he.taskChatEmployeeQuestion)).toBeTruthy();
    expect(screen.getByText("שאלה")).toBeTruthy();
  });

  it("falls back to the media-only label", () => {
    render(
      <TaskChatQuestionBanner
        message={question({ body: "", photo_url: "/p.jpg" })}
        composeEnabled
        onAnnotateReply={vi.fn()}
      />,
    );
    expect(screen.getByText(he.taskChatMediaOnly)).toBeTruthy();
    expect(screen.getByAltText(he.taskReferencePhoto)).toBeTruthy();
  });

  it("shows a file card when the question is a document", () => {
    render(
      <TaskChatQuestionBanner
        message={question({ body: "", file_url: "/uploads/d.pdf", file_name: "דוח.pdf" })}
        composeEnabled
        onAnnotateReply={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /דוח\.pdf/ })).toBeTruthy();
  });
});
