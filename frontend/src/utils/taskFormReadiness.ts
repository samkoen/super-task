import { he } from "../i18n/he";

export type TaskFormMissing = "branches" | "assignee" | "branch" | "dueAt";

export interface TaskFormReadinessInput {
  taskKind: "ad_hoc" | "fixed";
  /** Création groupée (plusieurs snifim) : pas de choix d'employé. */
  grouped: boolean;
  canPickBranch: boolean;
  selectedBranchCount: number;
  assigneeUserId: string;
  effectiveBranchId: string;
  /** Assignée à la galerie : aucune échéance requise. */
  toGallery: boolean;
  dueAt: string;
}

/** Ce qu'il manque encore avant de pouvoir créer la tâche (liste vide = prêt). */
export function taskFormMissing(input: TaskFormReadinessInput): TaskFormMissing[] {
  const missing: TaskFormMissing[] = [];
  if (input.canPickBranch && input.selectedBranchCount < 1) missing.push("branches");
  if (!input.grouped) {
    if (!input.assigneeUserId.trim()) missing.push("assignee");
    if (!input.effectiveBranchId.trim() && !missing.includes("branches")) missing.push("branch");
  }
  const needsDue = input.taskKind === "ad_hoc" && (input.grouped || !input.toGallery);
  if (needsDue && !input.dueAt) missing.push("dueAt");
  return missing;
}

const MISSING_TEXT: Record<TaskFormMissing, string> = {
  branches: he.newTaskMissingBranches,
  assignee: he.newTaskMissingAssignee,
  branch: he.newTaskMissingBranch,
  dueAt: he.newTaskMissingDueAt,
};

/** Phrase à afficher au-dessus du bouton, ou chaîne vide quand tout est prêt. */
export function taskFormMissingMessage(missing: TaskFormMissing[]): string {
  if (!missing.length) return "";
  return `${he.newTaskMissingPrefix} ${missing.map((key) => MISSING_TEXT[key]).join(" · ")}`;
}
