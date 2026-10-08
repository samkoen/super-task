import { describe, expect, it } from "vitest";
import {
  deliveryNoteNeedsUpdate,
  deliveryNoteTargetIds,
  formDeliveryNoteState,
  savedDeliveryNoteState,
} from "./deliveryNoteTemplate";

describe("deliveryNoteTemplate", () => {
  it("treats a template without teuda as closed with no type", () => {
    expect(savedDeliveryNoteState({})).toEqual({ opened: false, taskType: null });
    expect(formDeliveryNoteState({ delivery_note_task_type: "origin_list" })).toEqual({
      opened: false,
      taskType: null,
    });
  });

  it("defaults the type to the line check once opened", () => {
    expect(savedDeliveryNoteState({ opened_by_delivery_note: true })).toEqual({
      opened: true,
      taskType: "line_check",
    });
  });

  it("does not call the API when nothing changed", () => {
    const saved = savedDeliveryNoteState({ opened_by_delivery_note: true, delivery_note_task_type: "origin_list" });
    const wanted = formDeliveryNoteState({ opened_by_delivery_note: true, delivery_note_task_type: "origin_list" });
    expect(deliveryNoteNeedsUpdate(saved, wanted)).toBe(false);
  });

  it("calls the API when the switch or the type changes", () => {
    const saved = savedDeliveryNoteState({});
    expect(deliveryNoteNeedsUpdate(saved, formDeliveryNoteState({ opened_by_delivery_note: true }))).toBe(true);
    const opened = savedDeliveryNoteState({ opened_by_delivery_note: true });
    expect(
      deliveryNoteNeedsUpdate(opened, formDeliveryNoteState({ opened_by_delivery_note: true, delivery_note_task_type: "origin_list" })),
    ).toBe(true);
    expect(deliveryNoteNeedsUpdate(opened, formDeliveryNoteState({}))).toBe(true);
  });

  it("targets the edited template alone, or all network siblings without duplicates", () => {
    expect(deliveryNoteTargetIds("t1")).toEqual(["t1"]);
    expect(deliveryNoteTargetIds("t1", ["t1", "t2", "t3"])).toEqual(["t1", "t2", "t3"]);
    expect(deliveryNoteTargetIds("t1", ["t2"])).toEqual(["t1", "t2"]);
  });
});
