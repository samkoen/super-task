import type { FixedTaskBranch, FixedTaskGroup } from "../../../services/fixedTaskService";

/** Données de test partagées (jamais importées par le code de production). */
export function fixtureBranch(over: Partial<FixedTaskBranch> = {}): FixedTaskBranch {
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

export function fixtureGroup(over: Partial<FixedTaskGroup> = {}): FixedTaskGroup {
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
    branches: [fixtureBranch(), fixtureBranch({ template_id: "t2", branch_id: "b2", branch_name: "חיפה", assignee_name: "יוסי" })],
    template_ids: ["t1", "t2"],
    branch_count: 2,
    active_count: 2,
    overridden_count: 0,
    unassigned_count: 0,
    ...over,
  };
}
