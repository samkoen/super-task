import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeChatsPage from "./EmployeeChatsPage";
import { he } from "../../i18n/he";
import { directChatService } from "../../services/directChatService";
import { taskService } from "../../services/taskService";

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "e1", role: "employee" } }),
}));

vi.mock("../../services/directChatService", () => ({
  directChatService: {
    inbox: vi.fn(),
    openMine: vi.fn(),
  },
}));

vi.mock("../../services/taskService", () => ({
  taskService: { listEmployeeChats: vi.fn() },
}));

vi.mock("../../components/chat/DirectChatThread", () => ({
  default: () => <div>general-thread</div>,
}));

vi.mock("../../components/tasks/TaskChatPanel", () => ({
  default: ({ occurrenceId }: { occurrenceId: string }) => <div>task-thread:{occurrenceId}</div>,
}));

vi.mock("../../hooks/useDirectChatLiveSync", () => ({
  useDirectChatLiveSync: () => undefined,
}));

vi.mock("../../hooks/useTaskChangeListener", () => ({
  useTaskChangeListener: () => undefined,
}));

describe("EmployeeChatsPage", () => {
  beforeEach(() => {
    vi.mocked(directChatService.inbox).mockResolvedValue({
      items: [],
      up: null,
      unread_count: 1,
      managers: [
        {
          id: "c1",
          kind: "up",
          counterpart_user_id: "m1",
          counterpart_name: "מנהל",
          counterpart_role: "branch_manager",
          last_preview: "שלום",
          last_at: "2026-09-07T08:00:00+03:00",
          unread_count: 1,
          scope: "branch",
        },
      ],
    });
    vi.mocked(taskService.listEmployeeChats).mockResolvedValue({
      items: [
        {
          id: "occ-1",
          title: "מדף חלב",
          status: "in_progress",
          last_preview: "שאלה",
          last_at: "2026-09-07T10:00:00+03:00",
        },
      ],
    });
    vi.mocked(directChatService.openMine).mockResolvedValue({
      conversation: { id: "conv-1" },
      messages: [],
      peer: { id: "m1", full_name: "מנהל", role: "branch_manager" },
    });
  });

  it("lists the general chat first then open task chats", async () => {
    render(<EmployeeChatsPage />);
    expect(await screen.findByText(he.employeeGeneralChat)).toBeTruthy();
    expect(screen.getByText("מדף חלב")).toBeTruthy();
  });

  it("opens the general thread", async () => {
    render(<EmployeeChatsPage />);
    fireEvent.click(await screen.findByText(he.employeeGeneralChat));
    await waitFor(() => expect(screen.getByText("general-thread")).toBeTruthy());
  });

  it("opens the task chat", async () => {
    render(<EmployeeChatsPage />);
    fireEvent.click(await screen.findByText("מדף חלב"));
    await waitFor(() => expect(screen.getByText("task-thread:occ-1")).toBeTruthy());
  });
});
