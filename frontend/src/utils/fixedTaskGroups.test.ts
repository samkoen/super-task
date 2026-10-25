import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import type { FixedTaskBranch, FixedTaskGroup } from "../services/fixedTaskService";
import {
  branchOverrideSummary,
  branchPatchIsEmpty,
  branchToForm,
  buildBranchPatch,
  filterFixedGroups,
  fixedGroupChips,
  generalFormToPayload,
  groupToGeneralForm,
  groupToMedia,
  sortFixedGroups,
} from "./fixedTaskGroups";

function branch(over: Partial<FixedTaskBranch> = {}): FixedTaskBranch {
  return {
    template_id: "t1",
    branch_id: "b1",
    branch_name: "תל אביב",
    assignee_user_id: "u1",
    assignee_name: "דנה",
    due_time: "09:00",
    weekly_days: null,
    is_active: true,
    description: "",
    start_url: null,
    overridden_fields: [],
    opened_by_delivery_note: false,
    ...over,
  };
}

function group(over: Partial<FixedTaskGroup> = {}): FixedTaskGroup {
  return {
    key: "g1",
    network_group_id: "g1",
    is_network: true,
    can_edit_defaults: true,
    title: "בדיקת קירור",
    description: "",
    recurrence: "daily",
    due_time: "09:00",
    weekly_days: null,
    monthly_day: null,
    is_active: true,
    branches: [branch(), branch({ template_id: "t2", branch_id: "b2" })],
    template_ids: ["t1", "t2"],
    branch_count: 2,
    active_count: 2,
    overridden_count: 0,
    unassigned_count: 0,
    ...over,
  };
}

describe("filterFixedGroups / sortFixedGroups", () => {
  const active = group({ key: "a", title: "ב" });
  const paused = group({ key: "p", title: "א", active_count: 0 });

  it("filters by activity and searches by title", () => {
    expect(filterFixedGroups([active, paused], "active").map((g) => g.key)).toEqual(["a"]);
    expect(filterFixedGroups([active, paused], "inactive").map((g) => g.key)).toEqual(["p"]);
    expect(filterFixedGroups([active, paused], "all", " א ").map((g) => g.key)).toEqual(["p"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterFixedGroups([active], "all", "zzz")).toEqual([]);
    expect(filterFixedGroups([], "all")).toEqual([]);
  });

  it("puts active tasks first", () => {
    expect(sortFixedGroups([paused, active]).map((g) => g.key)).toEqual(["a", "p"]);
  });
});

describe("fixedGroupChips", () => {
  it("shows network, customized and unassigned chips only when relevant", () => {
    expect(fixedGroupChips(group())).toEqual({
      network: he.fixedTaskNetworkChipCount(2),
      customized: undefined,
      unassigned: undefined,
    });
    const chips = fixedGroupChips(group({ overridden_count: 3, unassigned_count: 1 }));
    expect(chips.customized).toBe(he.fixedGroupCustomizedChip(3));
    expect(chips.unassigned).toBe(he.fixedGroupUnassignedChip(1));
  });

  it("has no network chip for a single-branch task", () => {
    expect(fixedGroupChips(group({ is_network: false })).network).toBeUndefined();
  });
});

describe("branchOverrideSummary", () => {
  it("joins the labels of adapted fields", () => {
    const text = branchOverrideSummary({ overridden_fields: ["due_time", "is_active"] });
    expect(text).toBe(`${he.fixedOverrideFieldLabels.due_time} · ${he.fixedOverrideFieldLabels.is_active}`);
    expect(branchOverrideSummary({ overridden_fields: [] })).toBe("");
  });
});

describe("general form", () => {
  it("leaves the assignee empty for a network task and fills it for a single one", () => {
    expect(groupToGeneralForm(group()).assignee_user_id).toBe("");
    const single = group({ is_network: false, branches: [branch({ assignee_user_id: "u9" })] });
    expect(groupToGeneralForm(single).assignee_user_id).toBe("u9");
  });

  it("does not send the assignee for a network task", () => {
    const g = group();
    const payload = generalFormToPayload(g, groupToGeneralForm(g), groupToMedia(g), []);
    expect("assignee_user_id" in payload).toBe(false);
    expect(payload.title).toBe("בדיקת קירור");
  });

  it("sends the assignee for a single-branch task", () => {
    const g = group({ is_network: false, branches: [branch({ assignee_user_id: "u9" })] });
    const payload = generalFormToPayload(g, groupToGeneralForm(g), groupToMedia(g), []);
    expect(payload.assignee_user_id).toBe("u9");
  });
});

describe("buildBranchPatch", () => {
  const g = group();

  it("is empty when nothing changed", () => {
    const b = branch();
    expect(branchPatchIsEmpty(buildBranchPatch(b, g, branchToForm(b, g)))).toBe(true);
  });

  it("sets a custom time and the new assignee", () => {
    const b = branch();
    const form = { ...branchToForm(b, g), custom_due_time: true, due_time: "07:30", assignee_user_id: "u2" };
    const patch = buildBranchPatch(b, g, form);
    expect(patch.changes).toEqual({ due_time: "07:30", assignee_user_id: "u2" });
    expect(patch.reset).toEqual([]);
  });

  it("resets a field whose custom toggle was switched off", () => {
    const b = branch({ due_time: "07:30", overridden_fields: ["due_time"] });
    const form = { ...branchToForm(b, g), custom_due_time: false };
    expect(buildBranchPatch(b, g, form)).toEqual({ changes: {}, reset: ["due_time"] });
  });

  it("does not resend an unchanged customization", () => {
    const b = branch({ due_time: "07:30", overridden_fields: ["due_time"] });
    expect(branchPatchIsEmpty(buildBranchPatch(b, g, branchToForm(b, g)))).toBe(true);
  });

  it("sends the activity switch when it differs from the branch", () => {
    const b = branch();
    const patch = buildBranchPatch(b, g, { ...branchToForm(b, g), is_active: false });
    expect(patch.changes).toEqual({ is_active: false });
  });

  it("shows the default value while the field is not customized", () => {
    const b = branch({ description: "ישן" });
    const form = branchToForm(b, group({ description: "כללי" }));
    expect(form.description).toBe("כללי");
    expect(form.custom_description).toBe(false);
  });
});
