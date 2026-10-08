import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeliveryNoteTemplateFields from "./DeliveryNoteTemplateFields";
import { he } from "../../../i18n/he";

describe("DeliveryNoteTemplateFields", () => {
  it("only shows the explanation until the switch is on", () => {
    render(
      <DeliveryNoteTemplateFields enabled={false} onEnabledChange={vi.fn()} taskType={null} onTaskTypeChange={vi.fn()} />,
    );
    expect(screen.getByText(he.deliveryNoteOpenModelHint)).toBeTruthy();
    expect(screen.queryByText(he.deliveryNoteTaskTypeOrigin)).toBeNull();
  });

  it("reports the switch", () => {
    const onEnabledChange = vi.fn();
    render(
      <DeliveryNoteTemplateFields
        enabled={false}
        onEnabledChange={onEnabledChange}
        taskType={null}
        onTaskTypeChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: he.deliveryNoteOpenModel }));
    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });

  it("shows the task type choice and extra actions once enabled", () => {
    const onTaskTypeChange = vi.fn();
    render(
      <DeliveryNoteTemplateFields enabled onEnabledChange={vi.fn()} taskType={null} onTaskTypeChange={onTaskTypeChange}>
        <span>extra</span>
      </DeliveryNoteTemplateFields>,
    );
    expect(screen.getByText("extra")).toBeTruthy();
    fireEvent.click(screen.getByText(he.deliveryNoteTaskTypeOrigin));
    expect(onTaskTypeChange).toHaveBeenCalledWith("origin_list");
  });
});
