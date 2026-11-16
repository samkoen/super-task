import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import type { TaskGalleryItem } from "../services/taskGalleryService";
import { newWizardForm, wizardContext } from "./fixedTaskWizard";
import {
  formFromGalleryItem,
  formFromIssue,
  joinDueAt,
  onceBlocker,
  onceDefaults,
  splitDueAt,
  studioPayload,
} from "./studioOnce";

const ctxFor = (form: ReturnType<typeof newWizardForm>) =>
  wizardContext(form, { branches: [], employees: [], canPickBranch: false, defaultBranchId: "b1" });

describe("studioOnce", () => {
  it("starts « פעם אחת » today at the next useful time", () => {
    const defaults = onceDefaults("2026-11-16", new Date(2026, 10, 16, 9, 10));
    expect(defaults.taskKind).toBe("ad_hoc");
    expect(defaults.dueAt?.startsWith("2026-11-16T")).toBe(true);
  });

  it("splits and joins the date and the time", () => {
    expect(splitDueAt("2026-11-16T09:30")).toEqual({ date: "2026-11-16", time: "09:30" });
    expect(joinDueAt("2026-11-17", "09:30")).toBe("2026-11-17T09:30");
    expect(splitDueAt("")).toEqual({ date: "", time: "" });
  });

  it("asks for a full date and time only for « פעם אחת »", () => {
    const fixed = newWizardForm("b1");
    expect(onceBlocker(fixed)).toBe("");
    expect(onceBlocker({ ...fixed, taskKind: "ad_hoc", dueAt: "2026-11-16T" })).toBe(he.studioNeedDueAt);
    expect(onceBlocker({ ...fixed, taskKind: "ad_hoc", dueAt: "2026-11-16T09:00" })).toBe("");
  });

  it("sends a one-time task with its due date, and a fixed task unchanged", () => {
    const base = { ...newWizardForm("b1"), title: "ניקיון", assigneeUserId: "u1" };
    const once = studioPayload({ ...base, taskKind: "ad_hoc", dueAt: "2026-11-16T15:00" }, ctxFor(base));
    expect(once).toMatchObject({ task_kind: "ad_hoc", due_at: "2026-11-16T15:00", branch_id: "b1", assignee_user_id: "u1" });
    const fixed = studioPayload(base, ctxFor(base));
    expect(fixed).toMatchObject({ task_kind: "fixed", recurrence: "daily", due_at: "" });
  });

  it("fills the studio from a library model", () => {
    const item = {
      id: "g1", title: "סידור מדף", description: "", task_kind: "fixed", recurrence: "weekly", due_time: "07:30",
      weekly_days: "1", monthly_day: null, completion_requirements: [{ kind: "video", min_seconds: 10 }],
      reference_photo_url: "p.jpg", reference_video_url: null, reference_audio_url: null,
    } as unknown as TaskGalleryItem;
    const form = formFromGalleryItem(item);
    expect(form).toMatchObject({ taskKind: "fixed", title: "סידור מדף", recurrence: "weekly", dueTime: "07:30", weeklyDays: "1" });
    expect(form.completionRequirements).toHaveLength(1);
    expect(formFromGalleryItem({ ...item, task_kind: "ad_hoc" }).taskKind).toBe("ad_hoc");
  });

  it("turns an issue into a one-time task for its snif and oved", () => {
    const form = formFromIssue({
      branch_id: "b2", title: "נזילה", description: "ליד הקופה", assignee_user_id: "u9",
      reference_photo_url: "x.jpg", reference_video_url: "", reference_audio_url: "",
    });
    expect(form).toMatchObject({ taskKind: "ad_hoc", title: "נזילה", assigneeUserId: "u9", selectedBranchIds: ["b2"], branchChoices: { b2: "u9" } });
  });
});
