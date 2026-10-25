import { describe, expect, it } from "vitest";
import type { User } from "../services/api";
import { he } from "../i18n/he";
import {
  buildAssigneeRows,
  candidatesForBranch,
  firstBlockedStep,
  newWizardForm,
  nextStep,
  previousStep,
  restoreWizardForm,
  rowsToBranchAssignees,
  rowsWithoutEmployee,
  stepBlocker,
  wizardContext,
  wizardPayload,
  type WizardForm,
} from "./fixedTaskWizard";

const branches = [
  { id: "b1", name: "תל אביב" },
  { id: "b2", name: "חיפה" },
  { id: "b3", name: "אילת" },
];

const emp = (id: string, branch_id: string, extra: Partial<User> = {}) =>
  ({ id, full_name: `עובד ${id}`, role: "employee", is_active: true, branch_id, ...extra }) as User;

const employees = [emp("e1a", "b1"), emp("e1b", "b1"), emp("e2", "b2")];

function ready(overrides: Partial<WizardForm> = {}): WizardForm {
  return { ...newWizardForm("b1"), title: "פתיחה", ...overrides };
}

function network(form: WizardForm) {
  return wizardContext(form, { branches, employees, canPickBranch: true, defaultBranchId: "" });
}

describe("steps", () => {
  it("moves forward and back without leaving the range", () => {
    expect(nextStep("what")).toBe("when");
    expect(nextStep("where")).toBe("where");
    expect(previousStep("where")).toBe("when");
    expect(previousStep("what")).toBe("what");
  });
});

describe("assignee rows", () => {
  it("only offers active employees of the branch, not managers", () => {
    const list = [
      ...employees,
      emp("off", "b1", { is_active: false }),
      emp("mgr", "b1", { role: "branch_manager" }),
      emp("multi", "b9", { branches: [{ branch_id: "b1" }] } as Partial<User>),
    ];
    expect(candidatesForBranch(list, "b1").map((u) => u.id)).toEqual(["e1a", "e1b", "multi"]);
  });

  it("proposes the first employee, keeps a valid choice and drops an unknown one", () => {
    const rows = buildAssigneeRows(branches, ["b1", "b2", "b3"], employees, { b1: "e1b", b2: "ghost" });
    expect(rows.map((r) => [r.branchId, r.assigneeId])).toEqual([
      ["b1", "e1b"],
      ["b2", "e2"],
      ["b3", ""],
    ]);
    expect(rowsToBranchAssignees(rows)).toEqual({ b1: "e1b", b2: "e2" });
    expect(rowsWithoutEmployee(rows)).toEqual(["אילת"]);
  });

  it("returns nothing when no branch is selected", () => {
    expect(buildAssigneeRows(branches, [], employees, {})).toEqual([]);
  });
});

describe("wizardContext", () => {
  it("selects every branch until the manager touches the selection", () => {
    expect(network(ready()).selectedIds).toEqual(["b1", "b2", "b3"]);
    const touched = ready({ branchesTouched: true, selectedBranchIds: ["b2", "gone"] });
    expect(network(touched).selectedIds).toEqual(["b2"]);
  });

  it("uses only the own branch for a branch manager", () => {
    const ctx = wizardContext(ready(), {
      branches: [],
      employees,
      canPickBranch: false,
      defaultBranchId: "b1",
    });
    expect(ctx.selectedIds).toEqual(["b1"]);
    expect(ctx.rows).toEqual([]);
  });
});

describe("blockers", () => {
  it("asks for a title or a description on the first step", () => {
    const form = newWizardForm("b1");
    expect(stepBlocker("what", form, network(form))).toBe(he.fixedWizardNeedContent);
    const withText = { ...form, description: "לבדוק" };
    expect(stepBlocker("what", withText, network(withText))).toBe("");
  });

  it("rejects an invalid start link", () => {
    const form = ready({ startUrl: "not-a-url" });
    expect(stepBlocker("what", form, network(form))).toBe(he.startUrlInvalid);
  });

  it("asks for a snif when none is selected, and for an assignee on a single branch", () => {
    const none = ready({ branchesTouched: true, selectedBranchIds: [] });
    expect(stepBlocker("where", none, network(none))).toContain(he.newTaskMissingBranches);
    const lonely = ready({ branchesTouched: true, selectedBranchIds: ["b3"] });
    expect(stepBlocker("where", lonely, network(lonely))).toContain(he.newTaskMissingAssignee);
  });

  it("finds the first blocked step, or null when everything is ready", () => {
    const empty = newWizardForm("b1");
    expect(firstBlockedStep(empty, network(empty))).toBe("what");
    expect(firstBlockedStep(ready(), network(ready()))).toBeNull();
  });
});

describe("wizardPayload", () => {
  it("sends one assignee per branch when several branches are selected", () => {
    const form = ready({ branchChoices: { b1: "e1b" } });
    const payload = wizardPayload(form, network(form));
    expect(payload.apply_to_network).toBe(true);
    expect(payload.branch_assignees).toEqual({ b1: "e1b", b2: "e2" });
    expect(payload.branch_ids).toBeUndefined();
    expect(payload.assignee_user_id).toBe("");
  });

  it("lists the chosen branches when only some are selected", () => {
    const form = ready({ branchesTouched: true, selectedBranchIds: ["b1", "b2"] });
    const payload = wizardPayload(form, network(form));
    expect(payload.branch_ids).toEqual(["b1", "b2"]);
    expect(payload.task_kind).toBe("fixed");
  });

  it("creates a plain single-branch task for one selected branch", () => {
    const form = ready({ branchesTouched: true, selectedBranchIds: ["b2"] });
    const payload = wizardPayload(form, network(form));
    expect(payload).toMatchObject({ apply_to_network: false, branch_id: "b2", assignee_user_id: "e2" });
    expect(payload.branch_assignees).toBeUndefined();
  });

  it("uses the manager's own branch and chosen assignee", () => {
    const form = ready({ assigneeUserId: "e1a", startUrl: " https://x.co ", openedByDeliveryNote: true });
    const ctx = wizardContext(form, { branches: [], employees, canPickBranch: false, defaultBranchId: "b1" });
    const payload = wizardPayload(form, ctx);
    expect(payload).toMatchObject({ branch_id: "b1", assignee_user_id: "e1a", start_url: "https://x.co" });
    expect(payload.delivery_note_task_type).toBeTruthy();
  });
});

describe("restoreWizardForm", () => {
  it("returns the fresh form without a draft and merges a saved one", () => {
    const base = newWizardForm("b1");
    expect(restoreWizardForm(null, base)).toBe(base);
    const restored = restoreWizardForm({ ...base, title: "שמור", step: "where" }, base);
    expect(restored).toMatchObject({ title: "שמור", step: "where", branchChoices: {} });
  });

  it("falls back to the first step for an old draft without wizard fields", () => {
    const { step: _s, branchChoices: _c, branchesTouched: _t, ...legacy } = newWizardForm("b1");
    expect(restoreWizardForm({ ...legacy, title: "ישן" }, newWizardForm("b1")).step).toBe("what");
  });
});
