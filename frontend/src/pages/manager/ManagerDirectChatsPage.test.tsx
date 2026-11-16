import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManagerDirectChatsPage from "./ManagerDirectChatsPage";
import { he } from "../../i18n/he";
import { directChatService, type DirectChatInbox } from "../../services/directChatService";
import { taskService } from "../../services/taskService";

const { showError, showSuccess } = vi.hoisted(() => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError, showSuccess }),
}));

vi.mock("../../services/directChatService", () => ({
  directChatService: {
    inbox: vi.fn(),
    openMine: vi.fn(),
    openWith: vi.fn(),
  },
}));

vi.mock("../../services/taskService", () => ({
  taskService: {
    listManagerDayChats: vi.fn(),
  },
}));

vi.mock("../../components/chat/DirectChatThread", () => ({
  default: () => <div>direct-thread</div>,
}));

vi.mock("../../components/tasks/TaskChatDialog", () => ({
  default: ({ open, occurrenceId }: { open: boolean; occurrenceId: string }) =>
    open ? <div>task-thread-{occurrenceId}</div> : null,
}));

vi.mock("../../components/employee/EmployeeAvatar", () => ({
  default: () => <span data-testid="avatar" />,
}));

vi.mock("../../hooks/useDirectChatLiveSync", () => ({
  useDirectChatLiveSync: () => undefined,
}));

vi.mock("../../hooks/useTaskChangeListener", () => ({
  useTaskChangeListener: () => undefined,
}));

function inbox(): DirectChatInbox {
  return {
    items: [
      {
        id: "c1",
        kind: "down",
        counterpart_user_id: "e1",
        counterpart_name: "דן כהן",
        counterpart_role: "employee",
        branch_name: "תל אביב",
        last_preview: "שלום",
        last_at: "2026-09-14T10:00:00+03:00",
        unread_count: 0,
        direct_unread_count: 0,
      },
    ],
    up: {
      id: null,
      kind: "up",
      counterpart_user_id: "nm",
      counterpart_name: "רשת לוי",
      counterpart_role: "network_manager",
      last_preview: null,
      last_at: null,
      unread_count: 0,
    },
    unread_count: 0,
  };
}

function withTaskChat() {
  vi.mocked(directChatService.inbox).mockResolvedValue(inbox());
  vi.mocked(taskService.listManagerDayChats).mockResolvedValue({
    items: [
      {
        id: "o1",
        title: "מדף חלב",
        status: "awaiting_response",
        last_preview: "אפשר?",
        last_at: "2026-09-14T11:00:00+03:00",
        unread_count: 1,
      },
    ],
  });
}

describe("ManagerDirectChatsPage", () => {
  it("shows directs and task threads in one list, filter pills and search", async () => {
    withTaskChat();
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("מדף חלב")).toBeTruthy());
    expect(screen.getByText("דן כהן")).toBeTruthy();
    expect(screen.getByText(he.managerChatTaskContext)).toBeTruthy();
    expect(screen.getByTestId("manager-chats-filter-all")).toBeTruthy();
    expect(screen.getByLabelText(he.directChatSearch)).toBeTruthy();
  });

  it("keeps only task threads under the משימות pill", async () => {
    withTaskChat();
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("מדף חלב")).toBeTruthy());
    fireEvent.click(screen.getByTestId("manager-chats-filter-tasks"));
    expect(screen.queryByText("דן כהן")).toBeNull();
    expect(screen.getByText("מדף חלב")).toBeTruthy();
  });

  it("opens the task thread without opening a direct conversation", async () => {
    withTaskChat();
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("מדף חלב")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /מדף חלב/ }));
    await waitFor(() => expect(screen.getByText("task-thread-o1")).toBeTruthy());
    expect(directChatService.openWith).not.toHaveBeenCalled();
  });

  it("opens a direct conversation from a person row", async () => {
    withTaskChat();
    vi.mocked(directChatService.openWith).mockResolvedValue({
      conversation: { id: "c1" },
      messages: [],
      peer: { id: "e1", full_name: "דן כהן", role: "employee" },
    });
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("דן כהן")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /דן כהן/ }));
    await waitFor(() => expect(screen.getByText("direct-thread")).toBeTruthy());
    expect(directChatService.openWith).toHaveBeenCalledWith("e1");
  });

  it("shows the empty state when there is nothing", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue({ items: [], up: null, unread_count: 0 });
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText(he.managerChatsEmpty)).toBeTruthy());
  });
});
