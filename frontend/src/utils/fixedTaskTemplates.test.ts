import { describe, expect, it } from "vitest";
import type { TaskTemplate } from "../services/taskService";
import { he } from "../i18n/he";
import {
  filterFixedTemplates,
  formatTemplateSchedule,
  opsCategoryLabel,
  sortFixedTemplates,
} from "./fixedTaskTemplates";

function tpl(partial: Partial<TaskTemplate> & Pick<TaskTemplate, "id" | "title">): TaskTemplate {
  return {
    branch_id: "b1",
    description: "",
    recurrence: "daily",
    due_time: "09:00",
    weekly_days: null,
    monthly_day: null,
    assignee_user_id: "u1",
    department_id: null,
    task_kind: "fixed",
    photo_required: true,
    is_active: true,
    created_by_id: "m1",
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("fixedTaskTemplates", () => {
  it("filters active / inactive fixed only", () => {
    const items = [
      tpl({ id: "1", title: "A", is_active: true }),
      tpl({ id: "2", title: "B", is_active: false }),
      tpl({ id: "3", title: "C", task_kind: "ad_hoc" }),
    ];
    expect(filterFixedTemplates(items, "all").map((t) => t.id)).toEqual(["1", "2"]);
    expect(filterFixedTemplates(items, "active").map((t) => t.id)).toEqual(["1"]);
    expect(filterFixedTemplates(items, "inactive").map((t) => t.id)).toEqual(["2"]);
  });

  it("sorts active first then by title", () => {
    const sorted = sortFixedTemplates([
      tpl({ id: "1", title: "ב", is_active: false }),
      tpl({ id: "2", title: "א", is_active: true }),
      tpl({ id: "3", title: "ג", is_active: true }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["2", "3", "1"]);
  });

  it("formats schedule with weekday when weekly", () => {
    const text = formatTemplateSchedule(
      tpl({ id: "1", title: "x", recurrence: "weekly", weekly_days: "0", due_time: "10:30" }),
    );
    expect(text).toContain(he.recurrenceLabels.weekly);
    expect(text).toContain(he.weekdayMon);
    expect(text).toContain("10:30");
  });

  it("labels ops category", () => {
    expect(opsCategoryLabel(null)).toBe(he.opsCategoryNone);
    expect(opsCategoryLabel("cleaning")).toBe(he.opsCategoryLabels.cleaning);
  });
});
