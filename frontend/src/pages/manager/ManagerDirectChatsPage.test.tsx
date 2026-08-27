import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManagerDirectChatsPage from "./ManagerDirectChatsPage";
import { he } from "../../i18n/he";
import { directChatService } from "../../services/directChatService";

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

vi.mock("../../components/chat/DirectChatThread", () => ({
  default: () => <div>thread</div>,
}));

vi.mock("../../components/employee/EmployeeAvatar", () => ({
  default: () => <span data-testid="avatar" />,
}));

vi.mock("../../hooks/useDirectChatLiveSync", () => ({
  useDirectChatLiveSync: () => undefined,
}));

describe("ManagerDirectChatsPage", () => {
  it("lists ovdim and the network-manager thread", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue({
      items: [
        {
          id: "c1",
          kind: "down",
          counterpart_user_id: "e1",
          counterpart_name: "דן כהן",
          counterpart_role: "employee",
          last_preview: "שלום",
          last_at: "2026-08-26T10:00:00+03:00",
          unread_count: 1,
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
      unread_count: 1,
    });
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("דן כהן")).toBeTruthy());
    expect(screen.getByText(he.directChatManagerTitle)).toBeTruthy();
    expect(screen.getByText(he.directChatBroadcast)).toBeTruthy();
  });

  it("opens a thread with a visible back control that returns to the list", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue({
      items: [
        {
          id: "c1",
          kind: "down",
          counterpart_user_id: "e1",
          counterpart_name: "דן כהן",
          counterpart_role: "employee",
          last_preview: "שלום",
          last_at: "2026-08-26T10:00:00+03:00",
          unread_count: 0,
        },
      ],
      up: null,
      unread_count: 0,
    });
    vi.mocked(directChatService.openWith).mockResolvedValue({
      conversation: { id: "c1" },
      messages: [],
      peer: { id: "e1", full_name: "דן כהן", role: "employee" },
    });
    render(<ManagerDirectChatsPage />);
    await waitFor(() => expect(screen.getByText("דן כהן")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /דן כהן/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: he.goBack })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: he.goBack }));
    await waitFor(() => expect(screen.queryByText("thread")).toBeNull());
  });
});
