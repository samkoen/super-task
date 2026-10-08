import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeliveryLineCheck from "./DeliveryLineCheck";
import { ApiError } from "../../services/api";
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

const notOk = (product: string) => screen.getByRole("button", { name: `${he.deliveryNoteNotOk}: ${product}` });
const ok = (product: string) => screen.getByRole("button", { name: `${he.deliveryNoteConditionOk}: ${product}` });

describe("DeliveryLineCheck", () => {
  beforeEach(() => {
    vi.mocked(deliveryNoteService.checkForOccurrence).mockResolvedValue(note);
    vi.mocked(deliveryNoteService.submitAnswers).mockResolvedValue({
      suggested_overall: "problem",
      overall_status: "problem",
    });
  });

  it("shows one card per line, all OK by default, with the facts of each product", async () => {
    render(<DeliveryLineCheck occurrenceId="occ-1" />);
    expect(await screen.findByText("תעודת משלוח 2316228 · שפע כף החיים · טריים")).toBeTruthy();
    expect(screen.getByText(he.deliveryNoteCheckHint)).toBeTruthy();
    expect(screen.getByText(/1 קרטון/)).toBeTruthy();
    expect(screen.getByText(/9\.23/)).toBeTruthy();
    expect(screen.getByText("איטליה")).toBeTruthy();
    expect(screen.getByText("2 תקינות · 0 לא תקין · התקבל")).toBeTruthy();
    expect(ok("עגבניות").getAttribute("aria-pressed")).toBe("true");
    expect(notOk("עגבניות").getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps save off until a line marked not OK has a remark, then saves", async () => {
    render(<DeliveryLineCheck occurrenceId="occ-1" />);
    await screen.findByText(he.deliveryNoteCheckHint);
    fireEvent.click(notOk("תפוח מוזהב יבוא"));
    expect(screen.getByText("1 תקינות · 1 לא תקין · יש בעיה")).toBeTruthy();
    expect(screen.getByText(he.deliveryNoteFixNotes)).toBeTruthy();
    const save = screen.getByRole("button", { name: he.deliveryNoteSave }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "רקוב" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(deliveryNoteService.submitAnswers).toHaveBeenCalled());
    const payload = vi.mocked(deliveryNoteService.submitAnswers).mock.calls[0][1];
    expect(payload.lines[0]).toMatchObject({ arrival: "problem", note: "רקוב" });
    expect(payload.lines[1]).toMatchObject({ arrival: "ok", note: null });
    expect(await screen.findByText(he.deliveryNoteSaved)).toBeTruthy();
  });

  it("drops the remark when the line is switched back to OK", async () => {
    render(<DeliveryLineCheck occurrenceId="occ-1" />);
    await screen.findByText(he.deliveryNoteCheckHint);
    fireEvent.click(notOk("עגבניות"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "רקוב" } });
    fireEvent.click(ok("עגבניות"));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("2 תקינות · 0 לא תקין · התקבל")).toBeTruthy();
  });

  it("shows the error and keeps the form when saving fails", async () => {
    vi.mocked(deliveryNoteService.submitAnswers).mockRejectedValueOnce(new Error("x"));
    render(<DeliveryLineCheck occurrenceId="occ-1" />);
    await screen.findByText(he.deliveryNoteCheckHint);
    fireEvent.click(screen.getByRole("button", { name: he.deliveryNoteSave }));
    expect(await screen.findByText(he.errorGeneric)).toBeTruthy();
    expect(screen.queryByText(he.deliveryNoteSaved)).toBeNull();
  });

  it("renders nothing when the task has no delivery note (404)", async () => {
    vi.mocked(deliveryNoteService.checkForOccurrence).mockRejectedValueOnce(new ApiError("none", 404));
    const { container } = render(<DeliveryLineCheck occurrenceId="occ-2" />);
    await waitFor(() => expect(deliveryNoteService.checkForOccurrence).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("shows an error with retry on a server failure, then loads the note", async () => {
    vi.mocked(deliveryNoteService.checkForOccurrence).mockRejectedValueOnce(new ApiError("boom", 500));
    render(<DeliveryLineCheck occurrenceId="occ-3" />);
    expect(await screen.findByText(he.deliveryNoteLoadFailed)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.mediaCaptureRetry }));
    expect(await screen.findByText(he.deliveryNoteCheckHint)).toBeTruthy();
    expect(screen.queryByText(he.deliveryNoteLoadFailed)).toBeNull();
  });

  it("lists only products that have a country for the origin task", async () => {
    vi.mocked(deliveryNoteService.checkForOccurrence).mockResolvedValue({
      ...note,
      task_type: DELIVERY_TASK_ORIGIN,
    });
    render(<DeliveryLineCheck occurrenceId="occ-1" />);
    expect(await screen.findByText("תפוח מוזהב יבוא")).toBeTruthy();
    expect(screen.getByText(`${he.deliveryNoteColumnOrigin}: איטליה`)).toBeTruthy();
    expect(screen.queryByText("עגבניות")).toBeNull();
    expect(screen.queryByRole("button", { name: he.deliveryNoteSave })).toBeNull();
  });
});
