import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AgrolineConnectionCard from "./AgrolineConnectionCard";
import { he } from "../../i18n/he";
import { deliveryNoteService } from "../../services/deliveryNoteService";

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: {
    account: vi.fn(async () => ({ configured: false, username: "", internal: false })),
    saveAccount: vi.fn(),
    syncToday: vi.fn(),
    inbox: vi.fn(async () => []),
  },
}));

describe("AgrolineConnectionCard", () => {
  it("hides sync until an account is configured", () => {
    render(<AgrolineConnectionCard />);
    expect(screen.getByText(he.agrolineAccountTitle)).toBeTruthy();
    expect((screen.getByRole("button", { name: he.agrolineSync }) as HTMLButtonElement).disabled).toBe(true);
    expect(deliveryNoteService.account).toHaveBeenCalled();
  });

  it("shows a spinner while the sync is running", async () => {
    let release: (value: { results: never[]; errors: never[] }) => void = () => undefined;
    vi.mocked(deliveryNoteService.account).mockResolvedValue({
      configured: true,
      username: "user",
      internal: true,
    });
    vi.mocked(deliveryNoteService.syncToday).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    render(<AgrolineConnectionCard />);
    const button = await screen.findByRole("button", { name: he.agrolineSync });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    expect(await screen.findByRole("progressbar")).toBeTruthy();
    release({ results: [], errors: [] });
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
  });
});
