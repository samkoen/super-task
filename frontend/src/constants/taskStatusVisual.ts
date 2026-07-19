import type { TaskStatus } from "../services/taskService";

export type TaskStatusChipColor =
  | "default"
  | "primary"
  | "warning"
  | "success"
  | "error"
  | "info";

export interface TaskStatusVisual {
  chip: TaskStatusChipColor;
  /** Couleur barre latérale / accent. */
  bar: string;
  /** Bordure carte. */
  border: string;
  /** Fond doux de carte (sans photo). */
  surface: string;
}

/** Palette statut — distincte pour chaque état (ממתין ≠ בטיפול). */
export const TASK_STATUS_VISUAL: Record<TaskStatus, TaskStatusVisual> = {
  pending: {
    chip: "default",
    bar: "#64748B",
    border: "#94A3B8",
    surface: "#F1F5F9",
  },
  in_progress: {
    chip: "warning",
    bar: "#ED6C02",
    border: "#FFB74D",
    surface: "#FFF4E5",
  },
  pending_review: {
    chip: "info",
    bar: "#0288D1",
    border: "#4FC3F7",
    surface: "#E1F5FE",
  },
  completed: {
    chip: "success",
    bar: "#2E7D32",
    border: "#81C784",
    surface: "#E8F5E9",
  },
  overdue: {
    chip: "error",
    bar: "#D32F2F",
    border: "#E57373",
    surface: "#FFEBEE",
  },
  cancelled: {
    chip: "default",
    bar: "#9E9E9E",
    border: "#BDBDBD",
    surface: "#FAFAFA",
  },
};

export function taskStatusVisual(status: TaskStatus): TaskStatusVisual {
  return TASK_STATUS_VISUAL[status];
}

export function taskStatusChipColor(status: TaskStatus): TaskStatusChipColor {
  return TASK_STATUS_VISUAL[status].chip;
}
