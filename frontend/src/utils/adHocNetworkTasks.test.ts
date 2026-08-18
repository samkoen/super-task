import { describe, expect, it } from "vitest";
import type { TaskOccurrence } from "../services/taskService";
import { he } from "../i18n/he";
import {
  defaultApplyAdHocEditToNetwork,
  isNetworkAdHocOccurrence,
  networkAdHocChipLabel,
  networkAdHocIds,
} from "./adHocNetworkTasks";

function occ(
  partial: Partial<TaskOccurrence> & Pick<TaskOccurrence, "id" | "title">,
): TaskOccurrence {
  return {
    template_id: null,
    branch_id: "b1",
    description: "",
    due_at: "2026-08-18T10:00:00+03:00",
    status: "pending",
    assignee_user_id: "u1",
    department_id: null,
    task_kind: "ad_hoc",
    photo_required: true,
    started_at: null,
    created_at: "",
    updated_at: "",
    manager_user_id: null,
    ...partial,
  };
}

describe("adHocNetworkTasks", () => {
  it("detects network ad-hoc from group id or same content", () => {
    const items = [
      occ({ id: "1", title: "A", network_group_id: "g1" }),
      occ({ id: "2", title: "B", branch_id: "b1" }),
      occ({ id: "3", title: "B", branch_id: "b2" }),
      occ({ id: "4", title: "C", task_kind: "fixed" }),
    ];
    const ids = networkAdHocIds(items);
    expect(ids).toEqual(new Set(["1", "2", "3"]));
    expect(isNetworkAdHocOccurrence(items[0], ids)).toBe(true);
    expect(isNetworkAdHocOccurrence(items[3], ids)).toBe(false);
  });

  it("defaults edit-all-branches for network manager only", () => {
    const task = occ({ id: "1", title: "A", is_network_task: true });
    expect(defaultApplyAdHocEditToNetwork(task, true)).toBe(true);
    expect(defaultApplyAdHocEditToNetwork(task, false)).toBe(false);
  });

  it("labels chip as all-network or count", () => {
    const items = [
      occ({ id: "1", title: "A", branch_id: "b1", network_group_id: "g1" }),
      occ({ id: "2", title: "A", branch_id: "b2", network_group_id: "g1" }),
    ];
    expect(networkAdHocChipLabel(items[0], items, 4)).toBe(he.fixedTaskNetworkChipCount(2));
    expect(networkAdHocChipLabel(items[0], items, 2)).toBe(he.fixedTaskNetworkChip);
    expect(networkAdHocChipLabel(occ({ id: "x", title: "local" }), items, 2)).toBeNull();
  });
});
