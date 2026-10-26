import type { User } from "../services/api";
import type { NewTaskFormSubmitPayload } from "../components/tasks/NewTaskFormDialog";
import { he } from "../i18n/he";
import { DELIVERY_TASK_LINE_CHECK } from "./deliveryNote";
import { createFieldsFromBranchSelection } from "./fixedTaskCreateScope";
import type { FixedTaskCreateFormDraft } from "./fixedTaskScreenDraft";
import { startUrlFieldError } from "./startUrl";
import { taskFormMissing, taskFormMissingMessage } from "./taskFormReadiness";
import { DAILY_DEFAULT_WEEKDAYS } from "./taskRecurrence";
import { userBelongsToBranch } from "./userBranchMembership";

export type WizardStep = "what" | "when" | "where";
export const WIZARD_STEPS: WizardStep[] = ["what", "when", "where"];

export type BranchAssignees = Record<string, string>;

export type WizardForm = FixedTaskCreateFormDraft & {
  step: WizardStep;
  branchChoices: BranchAssignees;
  branchesTouched: boolean;
};

export interface BranchAssigneeRow {
  branchId: string;
  branchName: string;
  candidates: User[];
  /** Oved retenu pour ce snif, "" s'il n'y en a aucun. */
  assigneeId: string;
}

export interface WizardContext {
  canPickBranch: boolean;
  allBranchIds: string[];
  selectedIds: string[];
  rows: BranchAssigneeRow[];
  defaultBranchId: string;
}

export function newWizardForm(defaultBranchId: string): WizardForm {
  return {
    taskKind: "fixed",
    branchId: defaultBranchId,
    title: "",
    description: "",
    assigneeUserId: "",
    dueAt: "",
    recurrence: "daily",
    dueTime: "09:00",
    weeklyDays: DAILY_DEFAULT_WEEKDAYS,
    monthlyDay: 1,
    opsCategory: "",
    selectedBranchIds: [],
    completionRequirements: [],
    isWorkStart: false,
    isWorkEnd: false,
    startUrl: "",
    media: { reference_photo_url: "", reference_video_url: "", reference_audio_url: "" },
    openedByDeliveryNote: false,
    deliveryNoteTaskType: DELIVERY_TASK_LINE_CHECK,
    step: "what",
    branchChoices: {},
    branchesTouched: false,
  };
}

/** Reprend le brouillon gardé (si présent) par-dessus un formulaire neuf. */
export function restoreWizardForm(
  draft: FixedTaskCreateFormDraft | null,
  base: WizardForm,
): WizardForm {
  if (!draft) return base;
  return {
    ...base,
    ...draft,
    taskKind: "fixed",
    step: draft.step ?? base.step,
    branchChoices: draft.branchChoices ?? base.branchChoices,
    branchesTouched: draft.branchesTouched ?? base.branchesTouched,
  };
}

export function stepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

export function isFirstStep(step: WizardStep): boolean {
  return stepIndex(step) === 0;
}

export function isLastStep(step: WizardStep): boolean {
  return stepIndex(step) === WIZARD_STEPS.length - 1;
}

export function nextStep(step: WizardStep): WizardStep {
  return WIZARD_STEPS[Math.min(stepIndex(step) + 1, WIZARD_STEPS.length - 1)];
}

export function previousStep(step: WizardStep): WizardStep {
  return WIZARD_STEPS[Math.max(stepIndex(step) - 1, 0)];
}

/** Ovdim actifs du snif (le manager de snif n'est pas proposé : il est le repli côté serveur). */
export function candidatesForBranch(employees: User[], branchId: string): User[] {
  return employees.filter(
    (u) => u.role === "employee" && u.is_active !== false && userBelongsToBranch(u, branchId),
  );
}

/** Une ligne par snif choisi : le choix manuel s'il est encore valide, sinon le premier oved. */
export function buildAssigneeRows(
  branches: { id: string; name: string }[],
  selectedIds: string[],
  employees: User[],
  choices: BranchAssignees,
): BranchAssigneeRow[] {
  return branches
    .filter((b) => selectedIds.includes(b.id))
    .map((b) => {
      const candidates = candidatesForBranch(employees, b.id);
      const chosen = candidates.find((u) => u.id === choices[b.id]) ?? candidates[0];
      return { branchId: b.id, branchName: b.name, candidates, assigneeId: chosen?.id ?? "" };
    });
}

export function rowsToBranchAssignees(rows: BranchAssigneeRow[]): BranchAssignees {
  return Object.fromEntries(rows.filter((r) => r.assigneeId).map((r) => [r.branchId, r.assigneeId]));
}

export function rowsWithoutEmployee(rows: BranchAssigneeRow[]): string[] {
  return rows.filter((r) => r.candidates.length === 0).map((r) => r.branchName);
}

export function wizardContext(
  form: WizardForm,
  input: {
    branches: { id: string; name: string }[];
    employees: User[];
    canPickBranch: boolean;
    defaultBranchId: string;
  },
): WizardContext {
  const allBranchIds = input.branches.map((b) => b.id);
  const selectedIds = input.canPickBranch
    ? form.branchesTouched
      ? form.selectedBranchIds.filter((id) => allBranchIds.includes(id))
      : allBranchIds
    : [input.defaultBranchId];
  const rows = input.canPickBranch
    ? buildAssigneeRows(input.branches, selectedIds, input.employees, form.branchChoices)
    : [];
  return {
    canPickBranch: input.canPickBranch,
    allBranchIds,
    selectedIds,
    rows,
    defaultBranchId: input.defaultBranchId,
  };
}

function assigneeOf(form: WizardForm, ctx: WizardContext): string {
  return ctx.canPickBranch ? ctx.rows[0]?.assigneeId ?? "" : form.assigneeUserId;
}

function whatBlocker(form: WizardForm): string {
  if (!form.title.trim() && !form.description.trim()) return he.fixedWizardNeedContent;
  return startUrlFieldError(form.startUrl);
}

function whereBlocker(form: WizardForm, ctx: WizardContext): string {
  const scope = ctx.canPickBranch
    ? createFieldsFromBranchSelection(ctx.selectedIds, ctx.allBranchIds)
    : { grouped: false, branch_id: ctx.defaultBranchId };
  return taskFormMissingMessage(
    taskFormMissing({
      taskKind: "fixed",
      grouped: scope.grouped,
      canPickBranch: ctx.canPickBranch,
      selectedBranchCount: ctx.selectedIds.length,
      assigneeUserId: assigneeOf(form, ctx),
      effectiveBranchId: scope.branch_id,
      toGallery: false,
      dueAt: "",
    }),
  );
}

/** Ce qui empêche de quitter l'étape (chaîne vide = on peut continuer). */
export function stepBlocker(step: WizardStep, form: WizardForm, ctx: WizardContext): string {
  if (step === "what") return whatBlocker(form);
  if (step === "where") return whereBlocker(form, ctx);
  return "";
}

/** Première étape bloquée, ou null si tout est prêt pour créer. */
export function firstBlockedStep(form: WizardForm, ctx: WizardContext): WizardStep | null {
  return WIZARD_STEPS.find((s) => stepBlocker(s, form, ctx) !== "") ?? null;
}

type PayloadScope = Pick<
  NewTaskFormSubmitPayload,
  "branch_id" | "assignee_user_id" | "apply_to_network" | "branch_ids" | "branch_assignees"
>;

/** Où créer : tous/plusieurs snifim (un oved par snif) ou un seul snif. */
function scopeFields(form: WizardForm, ctx: WizardContext): PayloadScope {
  const scope = ctx.canPickBranch
    ? createFieldsFromBranchSelection(ctx.selectedIds, ctx.allBranchIds)
    : { grouped: false, branch_id: ctx.defaultBranchId, branch_ids: undefined };
  if (!scope.grouped) {
    return {
      branch_id: scope.branch_id,
      assignee_user_id: assigneeOf(form, ctx),
      apply_to_network: false,
    };
  }
  return {
    branch_id: "",
    assignee_user_id: "",
    apply_to_network: true,
    branch_ids: scope.branch_ids,
    branch_assignees: rowsToBranchAssignees(ctx.rows),
  };
}

export function wizardPayload(form: WizardForm, ctx: WizardContext): NewTaskFormSubmitPayload {
  const openedByNote = Boolean(form.openedByDeliveryNote);
  return {
    ...scopeFields(form, ctx),
    task_kind: "fixed",
    title: form.title,
    description: form.description,
    due_at: "",
    recurrence: form.recurrence,
    due_time: form.dueTime,
    weekly_days: form.weeklyDays,
    monthly_day: form.monthlyDay,
    media: form.media,
    ops_category: form.opsCategory || null,
    completion_requirements: form.completionRequirements,
    is_work_start: form.isWorkStart,
    is_work_end: form.isWorkEnd,
    start_url: form.startUrl.trim() || null,
    opened_by_delivery_note: openedByNote,
    delivery_note_task_type: openedByNote ? form.deliveryNoteTaskType ?? null : null,
  };
}
