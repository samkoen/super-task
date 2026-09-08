import { describe, expect, it, vi } from "vitest";
import { he } from "../i18n/he";
import {
  applyStartedOnDashboard,
  canDoTask,
  canSubmitEmployeeTask,
  cardAfterStart,
  doTaskButtonLabel,
  hasExternalStartUrl,
  needsTaskStart,
  revertStartedOnDashboard,
  completeAfterEnsuringStart,
  employeeSubmitLocked,
  isAlreadyStartedError,
  isCompleteBlockedUntilStart,
  requireLinkedStart,
  resolveTaskForComplete,
  shouldAutoCompleteEmployeeTask,
  shouldOpenStartUrlOnBegin,
  shouldStopAfterOpeningStartUrl,
  waitForInFlightLinkedStart,
} from "./employeeDoTask";

describe("employeeDoTask", () => {
  it("starts pending and overdue, not already in progress", () => {
    expect(needsTaskStart("pending")).toBe(true);
    expect(needsTaskStart("overdue")).toBe(true);
    expect(needsTaskStart("in_progress")).toBe(false);
    expect(canDoTask("pending")).toBe(true);
    expect(canDoTask("in_progress")).toBe(true);
    expect(canDoTask("pending_review")).toBe(false);
  });

  it("lets the first tap start a linked task before slots are filled", () => {
    const url = "https://my.agroline.co.il/main/azmanot/client-orders/create";
    expect(hasExternalStartUrl(url)).toBe(true);
    expect(hasExternalStartUrl("not-a-url")).toBe(false);
    expect(shouldOpenStartUrlOnBegin("pending", url)).toBe(true);
    expect(shouldOpenStartUrlOnBegin("overdue", url)).toBe(true);
    expect(shouldOpenStartUrlOnBegin("in_progress", url)).toBe(false);
    expect(canSubmitEmployeeTask("pending", url, false)).toBe(true);
    expect(canSubmitEmployeeTask("overdue", url, false)).toBe(true);
    expect(canSubmitEmployeeTask("in_progress", url, false)).toBe(false);
    expect(canSubmitEmployeeTask("pending", null, false)).toBe(false);
    expect(canSubmitEmployeeTask("in_progress", url, true)).toBe(true);
    expect(canSubmitEmployeeTask("in_progress", url, true, false)).toBe(true);
    expect(canSubmitEmployeeTask("in_progress", url, false, false)).toBe(false);
  });

  it("does not skip complete when the slots are already filled", () => {
    expect(shouldStopAfterOpeningStartUrl(true, false)).toBe(true);
    expect(shouldStopAfterOpeningStartUrl(true, true)).toBe(false);
    expect(shouldStopAfterOpeningStartUrl(false, true)).toBe(false);
  });

  it("surfaces a failed linked start instead of a silent skip", () => {
    expect(requireLinkedStart({ id: "t1" })).toEqual({ id: "t1" });
    expect(() => requireLinkedStart(null)).toThrow(he.taskStartNeedRetry);
  });

  it("only opens the link on the first tap when slots are empty", async () => {
    const pending = { id: "t1", status: "pending" as const, start_url: "https://example.com/x" };
    const started = await resolveTaskForComplete(pending, {
      openLink: true,
      slotsFilled: false,
      start: async () => ({ occurrence: { status: "in_progress" } }),
    });
    expect(started.deferComplete).toBe(true);
    expect(started.task.status).toBe("in_progress");
  });

  it("completes after start when the slots are already filled", async () => {
    const pending = { id: "t1", status: "pending" as const, start_url: "https://example.com/x" };
    const started = await resolveTaskForComplete(pending, {
      openLink: true,
      slotsFilled: true,
      start: async () => ({ occurrence: { status: "in_progress" } }),
    });
    expect(started.deferComplete).toBe(false);
    expect(started.task.status).toBe("in_progress");
  });

  it("treats an already-started server task as success", async () => {
    const refused = new Error("ניתן להתחיל רק משימה במצב ממתין או באיחור");
    expect(isAlreadyStartedError(refused, "in_progress")).toBe(true);
    expect(isAlreadyStartedError(refused, "completed")).toBe(false);
    expect(isAlreadyStartedError(refused, "pending")).toBe(false);
    const task = { id: "t1", status: "in_progress" as const };
    const started = await resolveTaskForComplete(task, {
      openLink: false,
      slotsFilled: true,
      start: async () => {
        throw refused;
      },
    });
    expect(started.deferComplete).toBe(false);
    expect(started.task.status).toBe("in_progress");
  });

  it("does not force a completed task into in_progress when start is refused", async () => {
    const task = { id: "t1", status: "completed" as const };
    await expect(
      resolveTaskForComplete(task, {
        openLink: false,
        slotsFilled: true,
        start: async () => {
          throw new Error("ניתן להתחיל רק משימה במצב ממתין או באיחור");
        },
      }),
    ).rejects.toThrow("ניתן להתחיל רק משימה");
  });

  it("starts on the server even if the card already looks in progress", async () => {
    const start = vi.fn(async () => ({ occurrence: { status: "in_progress" as const } }));
    const task = { id: "t1", status: "in_progress" as const, start_url: "https://example.com/x" };
    const started = await resolveTaskForComplete(task, {
      openLink: false,
      slotsFilled: true,
      start,
    });
    expect(start).toHaveBeenCalledTimes(1);
    expect(started.deferComplete).toBe(false);
    expect(started.task.status).toBe("in_progress");
  });

  it("retries complete after the server says the task was never started", async () => {
    expect(isCompleteBlockedUntilStart(new Error("יש להתחיל את המשימה לפני הסיום"))).toBe(true);
    expect(isCompleteBlockedUntilStart(new Error("network"))).toBe(false);
    const start = vi.fn(async () => undefined);
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new Error("יש להתחיל את המשימה לפני הסיום"))
      .mockResolvedValueOnce(undefined);
    await completeAfterEnsuringStart(complete, start);
    expect(start).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("auto-completes only after every required slot is filled", () => {
    expect(shouldAutoCompleteEmployeeTask(0, true, "in_progress", null)).toBe(false);
    expect(shouldAutoCompleteEmployeeTask(2, false, "in_progress", null)).toBe(false);
    expect(shouldAutoCompleteEmployeeTask(2, true, "in_progress", null)).toBe(true);
    expect(shouldAutoCompleteEmployeeTask(1, true, "pending", "https://example.com")).toBe(false);
    expect(shouldAutoCompleteEmployeeTask(1, true, "in_progress", "https://example.com", false)).toBe(
      false,
    );
    expect(shouldAutoCompleteEmployeeTask(1, true, "pending", null)).toBe(true);
    expect(shouldAutoCompleteEmployeeTask(1, false, "in_progress", null)).toBe(false);
  });

  it("locks submit while the annotation window is preparing or open", () => {
    expect(employeeSubmitLocked(false, true)).toBe(true);
    expect(employeeSubmitLocked(true, false)).toBe(true);
    expect(employeeSubmitLocked(false, false)).toBe(false);
  });

  it("waits for the in-flight linked start before complete", async () => {
    const url = "https://example.com/order";
    const pending = { id: "t1", status: "pending" as const, start_url: url };
    const started = { id: "t1", status: "in_progress" as const, start_url: url };
    const other = { id: "t2", status: "in_progress" as const, start_url: url };
    expect(await waitForInFlightLinkedStart(pending, Promise.resolve(true), "t1")).toEqual(pending);
    expect(await waitForInFlightLinkedStart(started, null, null)).toEqual(started);
    expect(await waitForInFlightLinkedStart(other, Promise.resolve(false), "t1")).toEqual(other);
    expect(await waitForInFlightLinkedStart(started, Promise.resolve(false), "t1")).toBeNull();
    const ready = await waitForInFlightLinkedStart(started, Promise.resolve(true), "t1");
    expect(ready?.status).toBe("in_progress");
    expect(ready?.start_url).toBe(url);
  });

  it("labels first click as do-task and resume as finish", () => {
    expect(doTaskButtonLabel("pending")).toBe(he.doTask);
    expect(doTaskButtonLabel("overdue")).toBe(he.doTask);
    expect(doTaskButtonLabel("in_progress")).toBe(he.markDone);
  });

  it("merges start API onto the card", () => {
    const next = cardAfterStart(
      { id: "t1", status: "pending", started_at: null },
      { status: "in_progress", started_at: "2026-08-19T10:00:00+03:00" },
    );
    expect(next.status).toBe("in_progress");
    expect(next.started_at).toBe("2026-08-19T10:00:00+03:00");
  });

  it("moves the started card into in-progress on the dashboard", () => {
    const updated = { id: "t1", status: "in_progress" };
    const next = applyStartedOnDashboard(
      {
        on_shift: false,
        urgent_tasks: [{ id: "t1", status: "pending" }],
        today_tasks: [{ id: "t1", status: "pending" }],
        in_progress_tasks: [],
      },
      "t1",
      updated,
    );
    expect(next?.on_shift).toBe(true);
    expect(next?.urgent_tasks).toEqual([]);
    expect(next?.today_tasks).toEqual([]);
    expect(next?.in_progress_tasks).toEqual([updated]);
  });

  it("is a noop when dashboard is missing", () => {
    expect(applyStartedOnDashboard(null, "t1", { id: "t1" })).toBeNull();
    expect(revertStartedOnDashboard(null, { id: "t1", status: "pending" })).toBeNull();
  });

  it("puts a fixed pending card back on today only", () => {
    const original = { id: "t1", status: "pending", task_kind: "fixed" };
    const next = revertStartedOnDashboard(
      {
        urgent_tasks: [],
        today_tasks: [],
        in_progress_tasks: [{ id: "t1", status: "in_progress", task_kind: "fixed" }],
      },
      original,
    );
    expect(next?.in_progress_tasks).toEqual([]);
    expect(next?.today_tasks).toEqual([original]);
    expect(next?.urgent_tasks).toEqual([]);
  });

  it("puts an overdue card back on today and urgent when start fails", () => {
    const original = { id: "t1", status: "overdue", task_kind: "fixed" };
    const next = revertStartedOnDashboard(
      {
        urgent_tasks: [],
        today_tasks: [],
        in_progress_tasks: [{ id: "t1", status: "in_progress", task_kind: "fixed" }],
      },
      original,
    );
    expect(next?.in_progress_tasks).toEqual([]);
    expect(next?.today_tasks).toEqual([original]);
    expect(next?.urgent_tasks).toEqual([original]);
  });

  it("puts an ad-hoc card back on today and urgent when start fails", () => {
    const original = { id: "t1", status: "pending", task_kind: "ad_hoc" };
    const next = revertStartedOnDashboard(
      {
        urgent_tasks: [],
        today_tasks: [],
        in_progress_tasks: [{ id: "t1", status: "in_progress", task_kind: "ad_hoc" }],
      },
      original,
    );
    expect(next?.in_progress_tasks).toEqual([]);
    expect(next?.today_tasks).toEqual([original]);
    expect(next?.urgent_tasks).toEqual([original]);
  });
});
