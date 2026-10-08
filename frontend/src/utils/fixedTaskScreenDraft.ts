import type { TaskReferenceMediaValue } from "../components/tasks/TaskReferenceMediaEditor";
import type { CompletionRequirement } from "./completionMedia";
import type { OpsCategory, TaskRecurrence, TaskTemplate } from "../services/taskService";

export type FixedTaskCreateFormDraft = {
  taskKind: "ad_hoc" | "fixed";
  branchId: string;
  title: string;
  description: string;
  assigneeUserId: string;
  dueAt: string;
  recurrence: TaskRecurrence;
  dueTime: string;
  weeklyDays: string;
  monthlyDay: number;
  opsCategory: OpsCategory | "";
  selectedBranchIds: string[];
  completionRequirements: CompletionRequirement[];
  isWorkStart: boolean;
  isWorkEnd: boolean;
  startUrl: string;
  media: TaskReferenceMediaValue;
  openedByDeliveryNote?: boolean;
  deliveryNoteTaskType?: string;
};

export type FixedTaskEditDraft = {
  template: TaskTemplate;
  form: {
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
    apply_to_network: boolean;
  };
  media: TaskReferenceMediaValue;
};

type CreateSlot = { open: boolean; form: FixedTaskCreateFormDraft | null };

export const MANAGER_FIXED_TASKS_DRAFT_KEY = "manager-fixed-tasks";

const createSlots = new Map<string, CreateSlot>();
const editSlots = new Map<string, FixedTaskEditDraft>();

export function readFixedTaskCreateDraft(key: string): CreateSlot | null {
  return createSlots.get(key) ?? null;
}

export function readFixedTaskCreateForm(key: string): FixedTaskCreateFormDraft | null {
  return createSlots.get(key)?.form ?? null;
}

export function setFixedTaskCreateOpen(key: string, open: boolean): void {
  if (!open) {
    createSlots.delete(key);
    return;
  }
  const current = createSlots.get(key);
  createSlots.set(key, { open: true, form: current?.form ?? null });
}

export function writeFixedTaskCreateForm(key: string, form: FixedTaskCreateFormDraft): void {
  createSlots.set(key, { open: true, form });
}

export function clearFixedTaskCreateDraft(key: string): void {
  createSlots.delete(key);
}

export function readFixedTaskEditDraft(key: string): FixedTaskEditDraft | null {
  return editSlots.get(key) ?? null;
}

export function writeFixedTaskEditDraft(key: string, draft: FixedTaskEditDraft | null): void {
  if (!draft) {
    editSlots.delete(key);
    return;
  }
  editSlots.set(key, draft);
}
