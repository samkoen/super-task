import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { he } from "../../i18n/he";
import { DELIVERY_TASK_LINE_CHECK, DELIVERY_TASK_ORIGIN } from "../../utils/deliveryNote";
import DeliveryTaskTypeField from "./DeliveryTaskTypeField";

describe("DeliveryTaskTypeField", () => {
  it("offers the origin list next to the line check, each with an explanation", () => {
    render(<DeliveryTaskTypeField value={null} onChange={() => undefined} />);
    expect(screen.getByText(he.deliveryNoteTaskTypeLineCheckHint)).toBeTruthy();
    expect(screen.getByText(he.deliveryNoteTaskTypeOriginHint)).toBeTruthy();
  });

  it("defaults to the line check when nothing is chosen", () => {
    render(<DeliveryTaskTypeField value={null} onChange={() => undefined} />);
    expect(
      screen.getByText(he.deliveryNoteTaskTypeLineCheck).closest("button")?.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("reports the chosen type", () => {
    const onChange = vi.fn();
    render(<DeliveryTaskTypeField value={DELIVERY_TASK_LINE_CHECK} onChange={onChange} />);
    fireEvent.click(screen.getByText(he.deliveryNoteTaskTypeOrigin));
    expect(onChange).toHaveBeenCalledWith(DELIVERY_TASK_ORIGIN);
  });
});
