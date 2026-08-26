import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerNetworkChatSetting from "./ManagerNetworkChatSetting";
import { he } from "../../i18n/he";
import { networkService } from "../../services/networkService";

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock("../../services/networkService", () => ({
  networkService: {
    list: vi.fn(),
    update: vi.fn(),
  },
}));

describe("ManagerNetworkChatSetting", () => {
  it("toggles manages-all-workers for the network manager", async () => {
    vi.mocked(networkService.list).mockResolvedValue([
      { id: "n1", name: "רשת", is_active: true, manages_all_workers: false },
    ]);
    vi.mocked(networkService.update).mockResolvedValue({
      message: "ok",
      network: { id: "n1", name: "רשת", is_active: true, manages_all_workers: true },
    });
    render(<ManagerNetworkChatSetting />);
    await waitFor(() => expect(screen.getByText(he.networkManagesAllWorkers)).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(networkService.update).toHaveBeenCalledWith("n1", { manages_all_workers: true }),
    );
  });
});
