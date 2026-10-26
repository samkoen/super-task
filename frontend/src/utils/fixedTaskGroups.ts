import { he } from "../i18n/he";
import type {
  FixedBranchChanges,
  FixedOverrideField,
  FixedTaskBranch,
  FixedTaskDefaultsPayload,
  FixedTaskGroup,
} from "../services/fixedTaskService";
import type { OpsCategory } from "../services/taskService";
import type { TaskReferenceMediaValue } from "../components/tasks/TaskReferenceMediaEditor";
import { asText } from "./asList";
import { effectiveRequirements, type CompletionRequirement } from "./completionMedia";
import { DELIVERY_TASK_LINE_CHECK } from "./deliveryNote";
import { initialWeeklyDays, weeklyDaysPayload } from "./taskRecurrence";

export type FixedGroupFilter = "all" | "active" | "inactive";

/** Filtre + recherche sur la liste des tâches fixes (une entrée par tâche). */
export function filterFixedGroups(
  groups: FixedTaskGroup[],
  filter: FixedGroupFilter,
  query = "",
): FixedTaskGroup[] {
  const needle = query.trim().toLocaleLowerCase();
  return groups.filter((g) => {
    if (filter === "active" && g.active_count === 0) return false;
    if (filter === "inactive" && g.active_count > 0) return false;
    return !needle || asText(g.title).toLocaleLowerCase().includes(needle);
  });
}

export function sortFixedGroups(groups: FixedTaskGroup[]): FixedTaskGroup[] {
  return [...groups].sort((a, b) => {
    if ((a.active_count > 0) !== (b.active_count > 0)) return a.active_count > 0 ? -1 : 1;
    return asText(a.title).localeCompare(asText(b.title), "he");
  });
}

export interface FixedGroupChips {
  network?: string;
  customized?: string;
  unassigned?: string;
}

export function fixedGroupChips(group: FixedTaskGroup): FixedGroupChips {
  return {
    network: group.is_network ? he.fixedTaskNetworkChipCount(group.branch_count) : undefined,
    customized: group.overridden_count ? he.fixedGroupCustomizedChip(group.overridden_count) : undefined,
    unassigned: group.unassigned_count ? he.fixedGroupUnassignedChip(group.unassigned_count) : undefined,
  };
}

export function branchOverrideSummary(branch: Pick<FixedTaskBranch, "overridden_fields">): string {
  return branch.overridden_fields.map((f) => he.fixedOverrideFieldLabels[f]).join(" · ");
}

// ---------------------------------------------------------------- Réglages généraux

export type FixedGeneralForm = {
  title: string;
  description: string;
  due_time: string;
  weekly_days: string;
  assignee_user_id: string;
  is_active: boolean;
  ops_category: OpsCategory | "";
  completion_requirements: CompletionRequirement[];
  is_work_start: boolean;
  is_work_end: boolean;
  start_url: string;
  opened_by_delivery_note: boolean;
  delivery_note_task_type: string;
};

export function groupToGeneralForm(group: FixedTaskGroup): FixedGeneralForm {
  return {
    title: asText(group.title),
    description: group.description ?? "",
    due_time: group.due_time || "09:00",
    weekly_days: initialWeeklyDays(group.recurrence, group.weekly_days),
    assignee_user_id: group.is_network ? "" : (group.branches[0]?.assignee_user_id ?? ""),
    is_active: group.is_active,
    ops_category: group.ops_category ?? "",
    completion_requirements: effectiveRequirements(group),
    is_work_start: Boolean(group.is_work_start),
    is_work_end: Boolean(group.is_work_end),
    start_url: group.start_url ?? "",
    opened_by_delivery_note: Boolean(group.opened_by_delivery_note),
    delivery_note_task_type: group.delivery_note_task_type || DELIVERY_TASK_LINE_CHECK,
  };
}

export function groupToMedia(group: FixedTaskGroup): TaskReferenceMediaValue {
  return {
    reference_photo_url: group.reference_photo_url ?? "",
    reference_video_url: group.reference_video_url ?? "",
    reference_audio_url: group.reference_audio_url ?? "",
  };
}

/** Corps de la requête « réglages généraux » (l'assigné n'est envoyé que pour une tâche d'un seul snif). */
export function generalFormToPayload(
  group: FixedTaskGroup,
  form: FixedGeneralForm,
  media: Partial<TaskReferenceMediaValue>,
  completion: CompletionRequirement[],
): FixedTaskDefaultsPayload {
  return {
    title: form.title,
    description: form.description,
    due_time: form.due_time,
    weekly_days: weeklyDaysPayload(group.recurrence, form.weekly_days) ?? group.weekly_days,
    is_active: form.is_active,
    ...(group.is_network ? {} : { assignee_user_id: form.assignee_user_id }),
    ops_category: form.ops_category || null,
    completion_requirements: completion,
    is_work_start: form.is_work_start,
    is_work_end: form.is_work_end,
    start_url: form.start_url,
    ...media,
  };
}

export function fixedGroupImpactText(group: Pick<FixedTaskGroup, "branch_count" | "overridden_count">): string {
  return he.fixedDetailImpact(group.branch_count, group.overridden_count);
}

// ---------------------------------------------------------------- Adaptation d'un snif

export type FixedBranchForm = {
  assignee_user_id: string;
  is_active: boolean;
  custom_due_time: boolean;
  due_time: string;
  custom_weekly_days: boolean;
  weekly_days: string;
  custom_description: boolean;
  description: string;
  custom_start_url: boolean;
  start_url: string;
  /** « מה העובד צריך לצרף » propre à ce snif. */
  custom_completion: boolean;
  completion_requirements: CompletionRequirement[];
};

const has = (b: FixedTaskBranch, f: FixedOverrideField) => b.overridden_fields.includes(f);

type GroupDefaults = Pick<
  FixedTaskGroup,
  | "recurrence"
  | "due_time"
  | "weekly_days"
  | "description"
  | "start_url"
  | "completion_requirements"
  | "photo_required"
  | "min_video_seconds"
>;

export function branchToForm(branch: FixedTaskBranch, group: GroupDefaults): FixedBranchForm {
  return {
    custom_completion: has(branch, "completion_requirements"),
    completion_requirements: effectiveRequirements(
      has(branch, "completion_requirements") ? branch : group,
    ),
    assignee_user_id: branch.assignee_user_id ?? "",
    is_active: branch.is_active,
    custom_due_time: has(branch, "due_time"),
    due_time: branch.due_time || group.due_time,
    custom_weekly_days: has(branch, "weekly_days"),
    weekly_days: initialWeeklyDays(group.recurrence, branch.weekly_days ?? group.weekly_days),
    custom_description: has(branch, "description"),
    description: has(branch, "description") ? (branch.description ?? "") : (group.description ?? ""),
    custom_start_url: has(branch, "start_url"),
    start_url: has(branch, "start_url") ? (branch.start_url ?? "") : (group.start_url ?? ""),
  };
}

type PatchField = "due_time" | "weekly_days" | "description" | "start_url";

function textFieldPatch(
  field: PatchField,
  branch: FixedTaskBranch,
  form: FixedBranchForm,
  value: string | null,
  patch: { changes: FixedBranchChanges; reset: FixedOverrideField[] },
): void {
  const custom = form[`custom_${field}` as const];
  const wasCustom = has(branch, field);
  if (!custom) {
    if (wasCustom) patch.reset.push(field);
    return;
  }
  const current = field === "weekly_days" ? branch.weekly_days : (branch[field] ?? "");
  if (!wasCustom || (value ?? "") !== (current ?? "")) {
    (patch.changes as Record<string, unknown>)[field] = value;
  }
}

function completionPatch(
  branch: FixedTaskBranch,
  form: FixedBranchForm,
  patch: { changes: FixedBranchChanges; reset: FixedOverrideField[] },
): void {
  const wasCustom = has(branch, "completion_requirements");
  if (!form.custom_completion) {
    if (wasCustom) patch.reset.push("completion_requirements");
    return;
  }
  const same = JSON.stringify(form.completion_requirements) === JSON.stringify(effectiveRequirements(branch));
  if (!wasCustom || !same) patch.changes.completion_requirements = form.completion_requirements;
}

/** Compare le formulaire au snif : valeurs posées (`changes`) et champs revenus au défaut (`reset`). */
export function buildBranchPatch(
  branch: FixedTaskBranch,
  group: Pick<FixedTaskGroup, "recurrence">,
  form: FixedBranchForm,
): { changes: FixedBranchChanges; reset: FixedOverrideField[] } {
  const patch: { changes: FixedBranchChanges; reset: FixedOverrideField[] } = { changes: {}, reset: [] };
  if (form.assignee_user_id && form.assignee_user_id !== (branch.assignee_user_id ?? "")) {
    patch.changes.assignee_user_id = form.assignee_user_id;
  }
  if (form.is_active !== branch.is_active) patch.changes.is_active = form.is_active;
  textFieldPatch("due_time", branch, form, form.due_time, patch);
  textFieldPatch(
    "weekly_days",
    branch,
    form,
    weeklyDaysPayload(group.recurrence, form.weekly_days) ?? null,
    patch,
  );
  textFieldPatch("description", branch, form, form.description, patch);
  textFieldPatch("start_url", branch, form, form.start_url.trim() || null, patch);
  completionPatch(branch, form, patch);
  return patch;
}

export function branchPatchIsEmpty(patch: { changes: FixedBranchChanges; reset: FixedOverrideField[] }): boolean {
  return Object.keys(patch.changes).length === 0 && patch.reset.length === 0;
}
