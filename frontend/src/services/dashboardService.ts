import api from "./api";
import type { TaskKind, TaskStatus } from "./taskService";

export type HealthLevel = "green" | "orange" | "red";

export interface DashboardCounts {
  tasks_total: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_overdue: number;
  tasks_cancelled: number;
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

export interface TeamMember {
  user_id: string;
  full_name: string;
  job_function: string | null;
  is_active: boolean;
  status: "in_progress" | "active" | "idle";
  current_task_title: string | null;
  current_department_name: string | null;
  completed_today: number;
  open_tasks: number;
}

export interface BranchSummary {
  branch_id: string;
  name: string;
  health: HealthLevel;
  overdue: number;
  pending: number;
  completion_rate: number;
}

export interface ManagerDashboard {
  due_on: string;
  branch: { id: string; name: string; network_id: string } | null;
  health: HealthLevel;
  counts: DashboardCounts;
  by_department: DepartmentSummary[] | null;
  team: TeamMember[] | null;
  recent_alerts: DashboardAlert[];
  branches: BranchSummary[] | null;
}

export interface EmployeeTaskCard {
  id: string;
  title: string;
  description: string;
  due_at: string;
  status: TaskStatus;
  task_kind: TaskKind;
  photo_required: boolean;
  department_name: string | null;
  started_at: string | null;
}

export interface EmployeeDashboard {
  due_on: string;
  employee: {
    id: string;
    full_name: string;
    job_function: string | null;
    branch_id: string;
    branch_name: string | null;
  };
  progress_percent: number;
  on_shift: boolean;
  counts: DashboardCounts;
  urgent_tasks: EmployeeTaskCard[];
  in_progress_tasks: EmployeeTaskCard[];
  today_tasks: EmployeeTaskCard[];
  completed_tasks: EmployeeTaskCard[];
}

export const dashboardService = {
  getManager: async (branchId?: string) => {
    const params = branchId ? { branch_id: branchId } : undefined;
    const response = await api.get<ManagerDashboard>("/dashboard/manager", { params });
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
      today_tasks: data.today_tasks ?? [],
      completed_tasks: data.completed_tasks ?? [],
    };
  },
};
