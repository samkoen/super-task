import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AgrolineConnectionCard from "./AgrolineConnectionCard";
import { he } from "../../i18n/he";
import { deliveryNoteService } from "../../services/deliveryNoteService";

const showSuccess = vi.fn();

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess }),
}));

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: {
    account: vi.fn(async () => ({ enabled: false, configured: false, username: "", internal: false })),
    saveAccount: vi.fn(),
    syncToday: vi.fn(),
    inbox: vi.fn(async () => []),
  },
}));

describe("AgrolineConnectionCard", () => {
  it("hides the Agroline fields until access is checked", async () => {
    render(<AgrolineConnectionCard />);
    expect(await screen.findByText(he.agrolineAccountTitle)).toBeTruthy();
    expect(screen.queryByLabelText(he.agrolineUsername)).toBeNull();
    expect(screen.queryByRole("button", { name: he.agrolineSync })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: he.agrolineAccess }));
    expect(screen.getByLabelText(he.agrolineUsername)).toBeTruthy();
  });

  it("shows the connection status and blocks saving without a username", async () => {
    vi.mocked(deliveryNoteService.account).mockResolvedValueOnce({
      enabled: true,
      configured: false,
      username: "",
      internal: false,
    });
    render(<AgrolineConnectionCard />);
    expect(await screen.findByText(he.agrolineNotConnected)).toBeTruthy();
    const save = screen.getByRole("button", { name: he.agrolineSaveAccount }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(he.agrolineUsername), { target: { value: "user" } });
    expect(save.disabled).toBe(false);
  });

  it("shows the sync actions with their explanation once connected", async () => {
    vi.mocked(deliveryNoteService.account).mockResolvedValueOnce({
      enabled: true,
      configured: true,
      username: "user",
      internal: false,
    });
    render(<AgrolineConnectionCard />);
    expect(await screen.findByText(he.agrolineConnected)).toBeTruthy();
    expect(screen.getByText(he.agrolineSyncHint)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.agrolineViewNotes })).toBeTruthy();
  });

  it("shows a spinner while the sync is running and reports how many teudot were read", async () => {
    let release: (value: { results: { opened_occurrence_ids: string[] }[]; errors: never[] }) => void = () => undefined;
    vi.mocked(deliveryNoteService.account).mockResolvedValue({
      enabled: true,
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
    release({ results: [{ opened_occurrence_ids: ["a"] }, { opened_occurrence_ids: ["b"] }], errors: [] });
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    expect(showSuccess).toHaveBeenCalledWith(`2 ${he.agrolineNotesRead}`);
    expect(screen.queryByText(he.agrolineInboxTitle)).toBeNull();
  });
});
