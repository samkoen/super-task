import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrderRead from "./OrderRead";
import { ApiError } from "../../services/api";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { he } from "../../i18n/he";

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: {
    ordersForOccurrence: vi.fn(),
    readOrders: vi.fn(),
  },
}));

describe("OrderRead", () => {
  beforeEach(() => {
    vi.mocked(deliveryNoteService.ordersForOccurrence).mockReset();
    vi.mocked(deliveryNoteService.readOrders).mockReset();
  });

  it("stays hidden when the task is not an order task", async () => {
    vi.mocked(deliveryNoteService.ordersForOccurrence).mockRejectedValue(new ApiError("אין", 404));
    render(<OrderRead occurrenceId="occ-1" />);
    await waitFor(() => expect(deliveryNoteService.ordersForOccurrence).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: he.orderReadButton })).toBeNull();
    expect(screen.queryByText(he.deliveryNoteLoadFailed)).toBeNull();
  });

  it("shows the pdf after the employee reads the orders", async () => {
    vi.mocked(deliveryNoteService.ordersForOccurrence).mockResolvedValue({ orders: [] });
    vi.mocked(deliveryNoteService.readOrders).mockResolvedValue({
      orders: [
        {
          agroline_number: "831155",
          customer_name: "שפע",
          document_date: "2026-10-12",
          pdf_url: "/uploads/agroline_orders/a.pdf",
        },
      ],
      errors: [],
    });
    render(<OrderRead occurrenceId="occ-1" />);
    fireEvent.click(await screen.findByRole("button", { name: he.orderReadButton }));
    expect(await screen.findByRole("link", { name: "הזמנה 831155" })).toBeTruthy();
    expect(screen.getByText("שפע")).toBeTruthy();
  });

  it("says there is nothing when the read comes back empty", async () => {
    vi.mocked(deliveryNoteService.ordersForOccurrence).mockResolvedValue({ orders: [] });
    vi.mocked(deliveryNoteService.readOrders).mockResolvedValue({ orders: [], errors: [] });
    render(<OrderRead occurrenceId="occ-1" />);
    fireEvent.click(await screen.findByRole("button", { name: he.orderReadButton }));
    expect(await screen.findByText(he.orderReadEmpty)).toBeTruthy();
  });
});
