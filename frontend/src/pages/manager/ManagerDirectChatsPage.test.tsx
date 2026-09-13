import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManagerDirectChatsPage from "./ManagerDirectChatsPage";
import { he } from "../../i18n/he";
import { directChatService, type DirectChatCard, type DirectChatInbox } from "../../services/directChatService";
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
  default: () => <div>thread</div>,
}));

vi.mock("../../components/tasks/TaskChatPanel", () => ({
  default: () => <div>task-thread</div>,
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

function inboxOved(overrides: Partial<DirectChatCard> = {}): DirectChatInbox {
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
        last_at: "2026-08-26T10:00:00+03:00",
        unread_count: 3,
        direct_unread_count: 1,
        task_unread_count: 2,
        ...overrides,
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
    unread_count: 3,
  };
}

describe("ManagerDirectChatsPage", () => {
  it("lists ovdim with branch tag and the network-manager thread", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue(inboxOved());
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("דן כהן")).toBeTruthy());
    expect(screen.getByText("תל אביב")).toBeTruthy();
    expect(screen.getByText(he.directChatManagerTitle)).toBeTruthy();
    expect(screen.getByText(he.directChatBroadcast)).toBeTruthy();
    expect(screen.getByLabelText(he.directChatSearch)).toBeTruthy();
  });

  it("filters contacts by branch search", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue(inboxOved());
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("דן כהן")).toBeTruthy());
    fireEvent.change(screen.getByLabelText(he.directChatSearch), { target: { value: "חיפה" } });
    expect(screen.getByText(he.directChatNoSearchResults)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(he.directChatSearch), { target: { value: "תל" } });
    expect(screen.getByText("דן כהן")).toBeTruthy();
  });

  it("opens employee day chats instead of the thread", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue(inboxOved());
    vi.mocked(taskService.listManagerDayChats).mockResolvedValue({
      items: [
        {
          id: "o1",
          title: "מדף",
          status: "in_progress",
          last_preview: "היי",
          last_at: "2026-08-26T11:00:00+03:00",
          unread_count: 2,
        },
      ],
    });
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("דן כהן")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /דן כהן/ }));
    await waitFor(() => expect(screen.getByText(he.employeeGeneralChat)).toBeTruthy());
    expect(screen.getByText("מדף")).toBeTruthy();
    expect(screen.queryByText("thread")).toBeNull();
    expect(directChatService.openWith).not.toHaveBeenCalled();
  });

  it("opens the general thread from the employee list", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue(inboxOved());
    vi.mocked(taskService.listManagerDayChats).mockResolvedValue({ items: [] });
    vi.mocked(directChatService.openWith).mockResolvedValue({
      conversation: { id: "c1" },
      messages: [],
      peer: { id: "e1", full_name: "דן כהן", role: "employee" },
    });
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("דן כהן")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /דן כהן/ }));
    await waitFor(() => expect(screen.getByText(he.employeeGeneralChat)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: new RegExp(he.employeeGeneralChat) }));
    await waitFor(() => expect(screen.getByText("thread")).toBeTruthy());
    fireEvent.click(screen.getAllByRole("button", { name: he.goBack })[0]);
    await waitFor(() => expect(screen.queryByText("thread")).toBeNull());
  });
});
