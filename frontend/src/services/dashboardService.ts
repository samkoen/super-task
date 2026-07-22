import api from "./api";
import type { TaskCompletion, TaskKind, TaskStatus } from "./taskService";

export type HealthLevel = "green" | "orange" | "red";

export interface DashboardCounts {
  tasks_total: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_overdue: number;
  tasks_cancelled: number;
  tasks_pending_review?: number;
  completion_rate: number;
  employees_total?: number;
  employees_active?: number;
  pending_delegation?: number;
  overdue_open?: number;
}

export interface DepartmentSummary {
  department_id: string | null;
  name: string;
  sort_order: number;
  health: HealthLevel;
  pending: number;
  in_progress: number;
  overdue: number;
  completed: number;
  total: number;
  completion_rate: number;
}

export interface DashboardAlert {
  type: "overdue" | "delegation" | "due_soon";
  occurrence_id: string;
  title: string;
  department_name: string | null;
  assignee_name: string | null;
  due_at: string;
  task_kind: TaskKind;
}

export interface TimelineTask {
  id: string;
  title: string;
  status: TaskStatus;
  segment:
    | "completed"
    | "in_progress"
    | "pending_review"
    | "awaiting_response"
    | "upcoming"
    | "overdue";
  due_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  elapsed_minutes: number | null;
  department_name: string | null;
  assignee_name: string | null;
  task_kind: TaskKind;
  manager_next_at?: string | null;
  is_manager_next?: boolean;
}

export interface TeamMember {
  user_id: string;
  full_name: string;
  job_function: string | null;
  is_active: boolean;
  status: "in_progress" | "active" | "idle";
  current_task_title: string | null;
  current_department_name: string | null;
  completed_today: number;
  total_today: number;
  open_tasks: number;
  timeline: TimelineTask[];
  overdue_backlog: TimelineTask[];
}

export interface TaskQueues {
  completed: TimelineTask[];
  in_progress: TimelineTask[];
  pending_review: TimelineTask[];
  upcoming: TimelineTask[];
}

export interface UnfinishedTask {
  occurrence_id: string;
  title: string;
  status: TaskStatus;
  due_at: string;
  overdue_days: number;
  department_name: string | null;
  assignee_name: string | null;
  pending_delegation: boolean;
  task_kind: TaskKind;
}

export interface BranchSummary {
  branch_id: string;
  name: string;
  health: HealthLevel;
  overdue: number;
  pending: number;
  completion_rate: number;
}

export type OpsCategory = "cleaning" | "fronts_signage";

export interface StoreCategoryKpi {
  category: OpsCategory;
  total: number;
  reported: number;
  approved: number;
  report_pct: number;
  approval_pct: number;
}

export interface StoreKpis {
  cleaning: StoreCategoryKpi;
  fronts_signage: StoreCategoryKpi;
}

export interface ManagerDashboard {
  due_on: string;
  branch: { id: string; name: string; network_id: string } | null;
  health: HealthLevel;
  counts: DashboardCounts;
  store_kpis?: StoreKpis | null;
  by_department: DepartmentSummary[] | null;
  team: TeamMember[] | null;
  task_queues: TaskQueues | null;
  unfinished_tasks: UnfinishedTask[] | null;
  recent_alerts: DashboardAlert[];
  branches: BranchSummary[] | null;
}

export interface EmployeeTaskCard {
  id: string;
  title: string;
  description: string;
  due_at: string;
  created_at?: string | null;
  status: TaskStatus;
  task_kind: TaskKind;
  photo_required: boolean;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  department_name: string | null;
  started_at: string | null;
  completion?: TaskCompletion | null;
  spoken_text?: string;
  display_language?: string;
  translation_pending?: boolean;
  title_he?: string;
  manager_next_at?: string | null;
  is_manager_next?: boolean;
}

export interface EmployeeDashboard {
  due_on: string;
  employee: {
    id: string;
    full_name: string;
    job_function: string | null;
    branch_id: string;
    branch_name: string | null;
    preferred_language?: string;
  };
  progress_percent: number;
  on_shift: boolean;
  counts: DashboardCounts;
  urgent_tasks: EmployeeTaskCard[];
  in_progress_tasks: EmployeeTaskCard[];
  awaiting_response_tasks: EmployeeTaskCard[];
  pending_review_tasks: EmployeeTaskCard[];
  today_tasks: EmployeeTaskCard[];
  completed_tasks: EmployeeTaskCard[];
}

export const dashboardService = {
  getManager: async (branchId?: string, dueOn?: string) => {
    const params: Record<string, string> = {};
    if (branchId) params.branch_id = branchId;
    if (dueOn) params.due_on = dueOn;
    const response = await api.get<ManagerDashboard>("/dashboard/manager", {
      params: Object.keys(params).length ? params : undefined,
    });
    return response.data;
  },

  getEmployee: async (dueOn?: string) => {
    const params = dueOn ? { due_on: dueOn } : undefined;
    const response = await api.get<EmployeeDashboard>("/dashboard/employee", { params });
    const data = response.data;
    return {
      ...data,
      urgent_tasks: data.urgent_tasks ?? [],
      in_progress_tasks: data.in_progress_tasks ?? [],
      awaiting_response_tasks: data.awaiting_response_tasks ?? [],
      pending_review_tasks: data.pending_review_tasks ?? [],
      today_tasks: data.today_tasks ?? [],
      completed_tasks: data.completed_tasks ?? [],
    };
  },
};
