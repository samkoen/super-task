import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { he } from "../../i18n/he";
import DeliveryTaskTypeField from "./DeliveryTaskTypeField";

describe("DeliveryTaskTypeField", () => {
  it("offers the origin list next to the line check", () => {
    render(<DeliveryTaskTypeField value={null} onChange={() => undefined} />);
    fireEvent.mouseDown(screen.getByLabelText(he.deliveryNoteTaskType));
    expect(screen.getByRole("option", { name: he.deliveryNoteTaskTypeLineCheck })).toBeTruthy();
    expect(screen.getByRole("option", { name: he.deliveryNoteTaskTypeOrigin })).toBeTruthy();
  });
});
