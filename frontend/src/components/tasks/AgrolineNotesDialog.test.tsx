import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AgrolineNotesDialog from "./AgrolineNotesDialog";
import { he } from "../../i18n/he";
import { deliveryNoteService } from "../../services/deliveryNoteService";

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: { inbox: vi.fn(async () => []) },
}));

describe("AgrolineNotesDialog", () => {
  it("lists the teuda number, the customer and the pdf as cards", async () => {
    vi.mocked(deliveryNoteService.inbox).mockResolvedValueOnce([
      {
        agroline_number: "2318018",
        customer_name: "יד השם",
        document_date: "2026-10-07",
        kind: "fresh",
        pdf_url: "https://example.test/teuda.pdf",
        lines: [
          { product_name: "תפוח", quantity: 1, unit: "קרטון" },
          { product_name: "אגס", quantity: 2, unit: "קרטון" },
        ],
      },
    ]);
    render(<AgrolineNotesDialog open onClose={() => undefined} />);
    expect(await screen.findByText("יד השם")).toBeTruthy();
    expect(screen.getByText(new RegExp("2318018"))).toBeTruthy();
    expect(screen.getByText(he.agrolineNotesCount(1))).toBeTruthy();
    const link = screen.getByRole("link", { name: he.deliveryNotePdf }) as HTMLAnchorElement;
    expect(link.href).toBe("https://example.test/teuda.pdf");
  });

  it("tells the manager what to do when nothing was read yet", async () => {
    render(<AgrolineNotesDialog open onClose={() => undefined} />);
    expect(await screen.findByText(he.agrolineInboxEmpty)).toBeTruthy();
    expect(screen.getByText(he.deliveryNoteNotesEmptyHint)).toBeTruthy();
  });

  it("shows an empty state instead of crashing when loading fails", async () => {
    vi.mocked(deliveryNoteService.inbox).mockRejectedValueOnce(new Error("boom"));
    render(<AgrolineNotesDialog open onClose={() => undefined} />);
    expect(await screen.findByText(he.agrolineInboxEmpty)).toBeTruthy();
  });
});
