import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AgrolineInbox from "./AgrolineInbox";
import { he } from "../../i18n/he";
import { deliveryNoteService } from "../../services/deliveryNoteService";

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: { inbox: vi.fn(async () => []) },
}));

describe("AgrolineInbox", () => {
  it("shows the saved teuda for the manager", async () => {
    vi.mocked(deliveryNoteService.inbox).mockResolvedValueOnce([
      {
        agroline_number: "2315109",
        customer_name: "שפע כנסת יחזקאל",
        document_date: "2026-10-05",
        kind: "fresh",
        lines: [{ product_name: "עגבניות", quantity: 12, unit: "ק״ג" }],
      },
    ]);
    render(<AgrolineInbox reloadKey={0} />);
    expect(await screen.findByText("2315109")).toBeTruthy();
    expect(screen.getByText("שפע כנסת יחזקאל")).toBeTruthy();
    expect(screen.getByText("עגבניות 12 ק״ג")).toBeTruthy();
    expect(screen.getByText(he.agrolineInboxTitle)).toBeTruthy();
  });
});
