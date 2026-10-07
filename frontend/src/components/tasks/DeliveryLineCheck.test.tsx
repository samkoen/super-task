import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeliveryLineCheck from "./DeliveryLineCheck";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { he } from "../../i18n/he";
import { DELIVERY_TASK_ORIGIN, type DeliveryCheck } from "../../utils/deliveryNote";

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: {
    checkForOccurrence: vi.fn(),
    submitAnswers: vi.fn(),
  },
}));

const note: DeliveryCheck = {
  agroline_number: "2316228",
  document_date: "2026-10-07",
  kind: "fresh",
  customer_name: "שפע כף החיים",
  pdf_url: null,
  lines: [
    {
      id: "line-1",
      position: 1,
      product_name: "תפוח מוזהב יבוא",
      quantity: 1,
      unit: "קרטון",
      origin_name: "איטליה",
      weight: 9.23,
      price: 10.5,
      image_url: null,
    },
    {
      id: "line-2",
      position: 2,
      product_name: "עגבניות",
      quantity: 2,
      unit: "יח",
      image_url: null,
    },
  ],
};

describe("DeliveryLineCheck", () => {
  beforeEach(() => {
    vi.mocked(deliveryNoteService.checkForOccurrence).mockResolvedValue(note);
    vi.mocked(deliveryNoteService.submitAnswers).mockResolvedValue({
      suggested_overall: "problem",
      overall_status: "problem",
    });
  });

  it("shows a table and keeps save off until a marked line has a remark", async () => {
    render(<DeliveryLineCheck occurrenceId="occ-1" />);
    expect(await screen.findByText("תעודת משלוח 2316228 · שפע כף החיים · טריים")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: he.deliveryNoteColumnPack })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: he.deliveryNoteColumnQty })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: he.deliveryNoteWeight })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: he.deliveryNoteNotOk })).toBeTruthy();
    expect(screen.getByText("קרטון")).toBeTruthy();
    expect(screen.getByText("9.23")).toBeTruthy();
    expect(screen.getByText("איטליה")).toBeTruthy();
    expect(screen.getByText("2 תקינות · 0 לא תקין · התקבל")).toBeTruthy();

    const boxes = screen.getAllByRole("checkbox", { name: he.deliveryNoteNotOk });
    fireEvent.click(boxes[0]);
    expect(screen.getByText("1 תקינות · 1 לא תקין · יש בעיה")).toBeTruthy();
    const save = screen.getByRole("button", { name: he.deliveryNoteSave });
    expect((save as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "רקוב" } });
    expect((save as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(deliveryNoteService.submitAnswers).toHaveBeenCalled());
    const payload = vi.mocked(deliveryNoteService.submitAnswers).mock.calls[0][1];
    expect(payload.lines[0]).toMatchObject({ arrival: "problem", note: "רקוב" });
    expect(payload.lines[1]).toMatchObject({ arrival: "ok", note: null });
  });

  it("lists only products that have a country for the origin task", async () => {
    vi.mocked(deliveryNoteService.checkForOccurrence).mockResolvedValue({
      ...note,
      task_type: DELIVERY_TASK_ORIGIN,
    });
    render(<DeliveryLineCheck occurrenceId="occ-1" />);
    expect(await screen.findByText("תפוח מוזהב יבוא")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: he.deliveryNoteColumnOrigin })).toBeTruthy();
    expect(screen.getByText("איטליה")).toBeTruthy();
    expect(screen.queryByText("עגבניות")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: he.deliveryNoteSave })).toBeNull();
  });
});
