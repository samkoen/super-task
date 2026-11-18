import { describe, expect, it } from "vitest";
import { emptyOccurrenceEditForm } from "../components/tasks/taskOccurrenceEditForm";
import { he } from "../i18n/he";
import { canMarkManagerNext, occurrenceDraftDirty, occurrenceEditBlocker } from "./occurrenceEditStudio";

const form = (patch = {}) => ({ ...emptyOccurrenceEditForm(), title: "סתם", due_at: "2026-11-18T09:30", assignee_user_id: "u1", ...patch });

describe("occurrenceEditBlocker", () => {
  it("asks for a title, then a full date and time", () => {
    expect(occurrenceEditBlocker(form({ title: "  " }), { task_kind: "fixed" })).toBe(he.studioNeedTitle);
    expect(occurrenceEditBlocker(form({ due_at: "2026-11-18T" }), { task_kind: "fixed" })).toBe(he.studioNeedDueAt);
  });

  it("asks for an oved only on an ad-hoc task", () => {
    expect(occurrenceEditBlocker(form({ assignee_user_id: "" }), { task_kind: "ad_hoc" })).toBe(he.newTaskAssigneeRequired);
    expect(occurrenceEditBlocker(form({ assignee_user_id: "" }), { task_kind: "fixed" })).toBe("");
  });
});

describe("occurrenceDraftDirty", () => {
  it("ignores spaces around the title but sees real changes and new files", () => {
    const initial = form();
    expect(occurrenceDraftDirty(form({ title: "סתם " }), initial, false)).toBe(false);
    expect(occurrenceDraftDirty(form({ due_at: "2026-11-18T10:00" }), initial, false)).toBe(true);
    expect(occurrenceDraftDirty(form(), initial, true)).toBe(true);
  });
});

describe("canMarkManagerNext", () => {
  it("only marks an open task that has an oved", () => {
    expect(canMarkManagerNext({ status: "pending", assignee_user_id: "u1" })).toBe(true);
    expect(canMarkManagerNext({ status: "pending", assignee_user_id: null })).toBe(false);
    expect(canMarkManagerNext({ status: "pending_review", assignee_user_id: "u1" })).toBe(false);
    expect(canMarkManagerNext({ status: "completed", assignee_user_id: "u1" })).toBe(false);
  });
});
