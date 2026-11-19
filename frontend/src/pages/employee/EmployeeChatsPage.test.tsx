import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeChatsPage from "./EmployeeChatsPage";
import { he } from "../../i18n/he";
import { directChatService } from "../../services/directChatService";
import { taskService } from "../../services/taskService";
import { taskChatListTitle } from "../../utils/employeeTaskChats";

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => vi.fn(),
}));
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
  taskService: { listEmployeeChats: vi.fn(), listEmployeeChatArchive: vi.fn() },
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
          due_at: "2026-09-07T08:00:00+03:00",
          last_preview: "שאלה",
          last_at: "2026-09-07T10:00:00+03:00",
        },
        {
          id: "occ-2",
          title: "מדף חלב",
          status: "in_progress",
          due_at: "2026-09-16T08:00:00+03:00",
          last_preview: "אתמול",
          last_at: "2026-09-16T11:00:00+03:00",
        },
      ],
      startable: [
        { id: "occ-new", title: "ספירת מדפים", status: "pending", due_at: "2026-09-16T06:30:00+03:00", visual_kind: "check" },
      ],
      archived_count: 4,
    });
    vi.mocked(taskService.listEmployeeChatArchive).mockResolvedValue({
      items: [
        {
          id: "occ-old",
          title: "ישן",
          status: "completed",
          due_at: "2026-08-01T08:00:00+03:00",
          last_preview: "סגור",
          last_at: "2026-08-01T10:00:00+03:00",
          chat_status: "approved",
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
    expect(await screen.findByText(he.employeeGeneralChatWith("מנהל"))).toBeTruthy();
    expect(screen.getByText(taskChatListTitle("מדף חלב", "2026-09-07T08:00:00+03:00"))).toBeTruthy();
    expect(screen.getByText(taskChatListTitle("מדף חלב", "2026-09-16T08:00:00+03:00"))).toBeTruthy();
  });

  it("opens the general thread", async () => {
    render(<EmployeeChatsPage />);
    fireEvent.click(await screen.findByText(he.employeeGeneralChatWith("מנהל")));
    await waitFor(() => expect(screen.getByText("general-thread")).toBeTruthy());
  });

  it("offers chat-less shift tasks in the new chat sheet", async () => {
    render(<EmployeeChatsPage />);
    fireEvent.click(await screen.findByRole("button", { name: he.employeeNewChat }));
    fireEvent.click(await screen.findByText("ספירת מדפים"));
    await waitFor(() => expect(screen.getByText("task-thread:occ-new")).toBeTruthy());
  });

  it("opens the archive of previous shifts", async () => {
    render(<EmployeeChatsPage />);
    fireEvent.click(await screen.findByText(he.employeeChatsArchive));
    expect(await screen.findByText("סגור")).toBeTruthy();
    expect(taskService.listEmployeeChatArchive).toHaveBeenCalled();
  });

  it("filters the list to approved chats", async () => {
    render(<EmployeeChatsPage />);
    await screen.findByText(he.employeeGeneralChatWith("מנהל"));
    fireEvent.click(screen.getByRole("button", { name: he.employeeChatsFilterApproved }));
    expect(await screen.findByText(he.employeeChatsFilterEmpty)).toBeTruthy();
  });

  it("asks which manager to talk to when there are several", async () => {
    const card = {
      kind: "up" as const,
      counterpart_role: "branch_manager",
      last_preview: null,
      last_at: null,
      unread_count: 0,
    };
    vi.mocked(directChatService.inbox).mockResolvedValue({
      items: [],
      up: null,
      unread_count: 0,
      managers: [
        { ...card, id: "c1", counterpart_user_id: "m1", counterpart_name: "דנה", scope: "branch" },
        { ...card, id: "c2", counterpart_user_id: "m2", counterpart_name: "רון", scope: "network" },
      ],
    });
    vi.mocked(directChatService.openMine).mockClear();
    render(<EmployeeChatsPage />);
    fireEvent.click(await screen.findByText(he.employeeGeneralChat));
    expect(await screen.findByText(he.chatPickManager)).toBeTruthy();
    expect(directChatService.openMine).not.toHaveBeenCalled();
  });

  it("opens the task chat", async () => {
    render(<EmployeeChatsPage />);
    fireEvent.click(await screen.findByText(taskChatListTitle("מדף חלב", "2026-09-07T08:00:00+03:00")));
    await waitFor(() => expect(screen.getByText("task-thread:occ-1")).toBeTruthy());
  });
});
