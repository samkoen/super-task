import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { he } from "../../i18n/he";
import { mediaRetentionService } from "../../services/mediaRetentionService";
import ManagerSettingsPage from "./ManagerSettingsPage";

const showError = vi.fn();
const showSuccess = vi.fn();

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError, showSuccess }),
}));

vi.mock("../../services/mediaRetentionService", () => ({
  mediaRetentionService: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

describe("ManagerSettingsPage", () => {
  beforeEach(() => {
    showError.mockReset();
    showSuccess.mockReset();
    vi.mocked(mediaRetentionService.get).mockReset();
    vi.mocked(mediaRetentionService.update).mockReset();
    vi.mocked(mediaRetentionService.get).mockResolvedValue({ retention_days: 1 });
    vi.mocked(mediaRetentionService.update).mockResolvedValue({ retention_days: 12 });
  });

  it("loads the current delay and saves a new number of days", async () => {
    render(<ManagerSettingsPage />);
    const input = await screen.findByLabelText(he.mediaRetentionDays);
    expect((input as HTMLInputElement).value).toBe("1");
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: he.mediaRetentionSave }));
    await waitFor(() => expect(mediaRetentionService.update).toHaveBeenCalledWith(12));
    expect(showSuccess).toHaveBeenCalledWith(he.mediaRetentionSaved);
  });

  it("does not save an empty or invalid day count", async () => {
    render(<ManagerSettingsPage />);
    const input = await screen.findByLabelText(he.mediaRetentionDays);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: he.mediaRetentionSave }));
    await waitFor(() => expect(showError).toHaveBeenCalledWith(he.mediaRetentionInvalid));
    expect(mediaRetentionService.update).not.toHaveBeenCalled();
  });
});
