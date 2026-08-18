export type FixedTaskScope = "one" | "selected" | "all";

export function isGroupedFixedCreate(scope: FixedTaskScope): boolean {
  return scope === "all" || scope === "selected";
}

export function isGroupedBranchSelection(selectedIds: string[]): boolean {
  return selectedIds.length > 1;
}

export function isAllBranchesSelected(selectedIds: string[], allIds: string[]): boolean {
  return allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
}

export function toggleAllBranches(selectedIds: string[], allIds: string[]): string[] {
  if (isAllBranchesSelected(selectedIds, allIds)) return [];
  return [...allIds];
}

export function toggleBranchId(selectedIds: string[], id: string): string[] {
  if (selectedIds.includes(id)) return selectedIds.filter((item) => item !== id);
  return [...selectedIds, id];
}

export function parseMultiSelectIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value) return value.split(",").filter(Boolean);
  return [];
}

export function selectedBranchLabels(
  ids: string[],
  branches: { id: string; name: string }[],
): string {
  const wanted = new Set(ids);
  return branches.filter((b) => wanted.has(b.id)).map((b) => b.name).join(", ");
}

export function createFieldsFromBranchSelection(
  selectedIds: string[],
  allIds: string[],
): {
  grouped: boolean;
  apply_to_network: boolean;
  branch_ids?: string[];
  branch_id: string;
} {
  if (selectedIds.length <= 1) {
    return {
      grouped: false,
      apply_to_network: false,
      branch_id: selectedIds[0] ?? "",
    };
  }
  if (isAllBranchesSelected(selectedIds, allIds)) {
    return { grouped: true, apply_to_network: true, branch_id: "" };
  }
  return {
    grouped: true,
    apply_to_network: true,
    branch_ids: selectedIds,
    branch_id: "",
  };
}

export function groupedCreateApiFields(payload: {
  apply_to_network?: boolean;
  branch_ids?: string[];
  branch_id: string;
  assignee_user_id: string;
}): {
  apply_to_network?: boolean;
  branch_ids?: string[];
  branch_id?: string;
  assignee_user_id?: string;
} {
  if (!payload.apply_to_network) {
    return { branch_id: payload.branch_id, assignee_user_id: payload.assignee_user_id };
  }
  return {
    apply_to_network: true,
    ...(payload.branch_ids?.length ? { branch_ids: payload.branch_ids } : {}),
  };
}
