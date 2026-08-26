import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ManagerDirectChatsPage from "./ManagerDirectChatsPage";
import { he } from "../../i18n/he";
import { directChatService } from "../../services/directChatService";

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
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

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));

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
});
