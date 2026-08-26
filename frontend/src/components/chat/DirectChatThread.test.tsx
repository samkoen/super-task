import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DirectChatThread from "./DirectChatThread";
import { he } from "../../i18n/he";
import { directChatService } from "../../services/directChatService";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "emp-1", role: "employee", full_name: "עובד" } }),
}));

vi.mock("../../services/directChatService", () => ({
  directChatService: {
    listMessages: vi.fn(),
    send: vi.fn(),
    broadcast: vi.fn(),
    uploadPhoto: vi.fn(),
    uploadVideo: vi.fn(),
    uploadAudio: vi.fn(),
  },
}));

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));
vi.mock("../media/MediaCaptureActions", () => ({ default: () => null }));

describe("DirectChatThread", () => {
  beforeEach(() => {
    vi.mocked(directChatService.listMessages).mockReset();
    vi.mocked(directChatService.send).mockReset();
  });

  it("shows an empty thread then sends text", async () => {
    vi.mocked(directChatService.listMessages).mockResolvedValue([]);
    vi.mocked(directChatService.send).mockResolvedValue({});
    render(<DirectChatThread conversationId="c1" />);
    await waitFor(() => expect(screen.getByText(he.directChatEmpty)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(he.directChatPlaceholder), {
      target: { value: "שלום מנהל" },
    });
    fireEvent.click(screen.getByText(he.taskChatSend));
    await waitFor(() => {
      expect(directChatService.send).toHaveBeenCalledWith("c1", expect.objectContaining({ body: "שלום מנהל" }));
    });
  });
});
