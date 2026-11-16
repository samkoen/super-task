import { describe, expect, it } from "vitest";
import type { User } from "../services/api";
import type { TeamMember, TimelineTask } from "../services/dashboardService";
import { he } from "../i18n/he";
import { buildTeamRoster, memberLateCount, rosterEntry, teamRowLine, teamSections, teamSummary } from "./managerTeam";

function user(id: string, patch: Partial<User> = {}): User {
  return { id, full_name: `עובד ${id}`, first_name: "", last_name: "", email: `${id}@x`, role: "employee", phone: null, job_function: null, network_id: "n1", branch_id: "b1", is_active: true, email_verified: true, ...patch } as User;
}

function task(id: string, status: TimelineTask["status"], hour = 9): TimelineTask {
  return { id, title: id, status, segment: status === "overdue" ? "overdue" : "upcoming", due_at: new Date(2026, 10, 16, hour).toISOString(), started_at: hour < 8 ? new Date(2026, 10, 16, hour).toISOString() : null } as TimelineTask;
}

function member(id: string, patch: Partial<TeamMember> = {}): TeamMember {
  return {
    user_id: id, full_name: `עובד ${id}`, job_function: null, is_active: true, status: "active", current_task_title: null,
    current_department_name: null, completed_today: 0, total_today: 2, open_tasks: 2, timeline: [], overdue_backlog: [], ...patch,
  } as TeamMember;
}

describe("managerTeam", () => {
  it("counts late tasks of the day and of the backlog once", () => {
    const late = task("t1", "overdue");
    expect(memberLateCount(member("u1", { timeline: [late, task("t2", "pending")], overdue_backlog: [late, task("t3", "overdue")] }))).toBe(2);
    expect(memberLateCount(null)).toBe(0);
  });

  it("keeps only the oveds of the snif looked at, with their state of the day", () => {
    const users = [user("u1"), user("u2", { branch_id: "b2" }), user("u3", { branch_id: "b2", branches: [{ branch_id: "b1", branch_name: "TEST", is_primary: false }] })];
    const roster = buildTeamRoster(users, [member("u1", { status: "in_progress", current_task_title: "ספירה" })], "b1");
    expect(roster.map((e) => e.id).sort()).toEqual(["u1", "u3"]);
    const u1 = roster.find((e) => e.id === "u1");
    expect(u1).toMatchObject({ state: "working", detail: "ספירה", total: 2, branchId: "b1" });
    expect(roster.find((e) => e.id === "u3")?.state).toBe("unknown");
  });

  it("opens a multi-snif oved's sheet on the snif looked at, not on his home snif", () => {
    const multi = user("u3", { branch_id: "b2", branches: [{ branch_id: "b1", branch_name: "TEST", is_primary: false }] });
    expect(buildTeamRoster([multi], null, "b1")[0].branchId).toBe("b1");
    // Vue « כל הרשת » : son snif de rattachement.
    expect(buildTeamRoster([multi], null, "")[0].branchId).toBe("b2");
  });

  it("keeps the home snif when the oved is not in the scope snif", () => {
    expect(rosterEntry(user("u2", { branch_id: "b2" }), null, "b1").branchId).toBe("b2");
  });

  it("puts the oveds with nothing going on first, the closed accounts last", () => {
    const users = [user("done"), user("off", { is_active: false }), user("idle"), user("work")];
    const team = [
      member("done", { completed_today: 2, total_today: 2 }),
      member("idle", { timeline: [task("a", "completed", 7)] }),
      member("work", { status: "in_progress" }),
      member("off"),
    ];
    expect(buildTeamRoster(users, team).map((e) => e.state)).toEqual(["idle", "working", "done", "noAccess"]);
  });

  it("keeps an oved known only from the dashboard", () => {
    const roster = buildTeamRoster([], [member("u9", { branch_name: "TEST" })], "b1");
    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({ id: "u9", user: null, branchLabel: "TEST", branchId: "b1" });
  });

  it("shows the late ones first inside a state", () => {
    const team = [member("a"), member("b", { overdue_backlog: [task("x", "overdue")] })];
    const roster = buildTeamRoster([user("a"), user("b")], team);
    expect(roster.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("groups by state and skips the empty sections", () => {
    const roster = buildTeamRoster([user("a"), user("b", { is_active: false })], null);
    expect(teamSections(roster).map((s) => [s.state, s.entries.length])).toEqual([["unknown", 1], ["noAccess", 1]]);
    expect(teamSections([])).toEqual([]);
  });

  it("writes the row line with the task in progress and the snif in network view", () => {
    const entry = rosterEntry(user("u1", { branch_name: "TEST" }), member("u1", { status: "in_progress", current_task_title: "ספירה" }));
    expect(teamRowLine(entry, false)).toBe(`${he.managerHomeTeamStates.working}: ספירה`);
    expect(teamRowLine(entry, true)).toBe(`${he.managerHomeTeamStates.working}: ספירה · TEST`);
    expect(teamRowLine(rosterEntry(user("u2", { is_active: false }), null), false)).toBe(he.managerTeamNoAccess);
  });

  it("sums the late tasks and tells when no live state is known", () => {
    const roster = buildTeamRoster([user("a"), user("b")], [member("a", { overdue_backlog: [task("x", "overdue")] })]);
    expect(teamSummary(roster)).toEqual({ total: 2, late: 1, live: true });
    expect(teamSummary(buildTeamRoster([user("a")], null)).live).toBe(false);
  });
});
