import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  employeeFirstName,
  employeeGreeting,
  pickNextTask,
  withoutTask,
} from "./employeeNextTask";

function t(id: string, over: Partial<Parameters<typeof pickNextTask>[0]["routine"][number]> = {}) {
  return { id, status: "pending", due_at: "2026-09-02T10:00:00+03:00", ...over };
}

describe("pickNextTask", () => {
  it("returns null when nothing is open", () => {
    expect(pickNextTask({ dynamic: [], routine: [] })).toBeNull();
  });

  it("prefers a task already in progress", () => {
    const lists = {
      dynamic: [t("late", { due_at: "2026-09-02T07:00:00+03:00" })],
      routine: [t("started", { status: "in_progress", due_at: "2026-09-02T20:00:00+03:00" })],
    };
    expect(pickNextTask(lists)?.id).toBe("started");
  });

  it("then prefers the task the manager asked for", () => {
    const lists = {
      dynamic: [],
      routine: [
        t("early", { due_at: "2026-09-02T07:00:00+03:00" }),
        t("asked", { is_manager_next: true, due_at: "2026-09-02T18:00:00+03:00" }),
      ],
    };
    expect(pickNextTask(lists)?.id).toBe("asked");
  });

  it("falls back to the most overdue task", () => {
    const lists = {
      dynamic: [t("b", { due_at: "2026-09-02T12:00:00+03:00" })],
      routine: [t("a", { due_at: "2026-09-02T08:00:00+03:00" })],
    };
    expect(pickNextTask(lists)?.id).toBe("a");
  });
});

describe("withoutTask", () => {
  it("removes the spotlighted task from both lists", () => {
    const lists = { dynamic: [t("a")], routine: [t("a"), t("b")] };
    const rest = withoutTask(lists, "a");
    expect(rest.dynamic).toEqual([]);
    expect(rest.routine.map((x) => x.id)).toEqual(["b"]);
  });

  it("keeps the lists untouched without an id", () => {
    const lists = { dynamic: [t("a")], routine: [] };
    expect(withoutTask(lists, null)).toBe(lists);
  });
});

describe("employeeGreeting", () => {
  it("follows the time of day", () => {
    expect(employeeGreeting(8)).toBe(he.employeeGreetingMorning);
    expect(employeeGreeting(14)).toBe(he.employeeGreetingNoon);
    expect(employeeGreeting(19)).toBe(he.employeeGreetingEvening);
    expect(employeeGreeting(2)).toBe(he.employeeGreetingNight);
  });
});

describe("employeeFirstName", () => {
  it("keeps the first word only", () => {
    expect(employeeFirstName("דני עובד")).toBe("דני");
  });

  it("handles missing names", () => {
    expect(employeeFirstName(undefined)).toBe("");
    expect(employeeFirstName("   ")).toBe("");
  });
});
