import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AgrolineNotesDialog from "./AgrolineNotesDialog";
import { he } from "../../i18n/he";
import { deliveryNoteService } from "../../services/deliveryNoteService";

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: { inbox: vi.fn(async () => []) },
}));

describe("AgrolineNotesDialog", () => {
  it("lists the teuda number, the customer and the pdf", async () => {
    vi.mocked(deliveryNoteService.inbox).mockResolvedValueOnce([
      {
        agroline_number: "2318018",
        customer_name: "יד השם",
        document_date: "2026-10-07",
        kind: "fresh",
        pdf_url: "https://example.test/teuda.pdf",
        lines: [],
      },
    ]);
    render(<AgrolineNotesDialog open onClose={() => undefined} />);
    expect(await screen.findByText("2318018")).toBeTruthy();
    expect(screen.getByText("יד השם")).toBeTruthy();
    const link = screen.getByRole("link", { name: he.deliveryNotePdf }) as HTMLAnchorElement;
    expect(link.href).toBe("https://example.test/teuda.pdf");
  });
});
