import api from "./api";

export type ReportPeriod = "today" | "7d" | "30d";

export interface EmployeeWorkReportRow {
  user_id: string;
  full_name: string;
  job_function: string | null;
  branch_id: string | null;
  branch_name: string | null;
  is_active: boolean;
  assigned_count: number;
  completed_count: number;
  completion_pct: number;
  overdue_count: number;
  avg_completion_minutes: number | null;
  last_activity_at: string | null;
}

export interface EmployeeWorkReportSummary {
  employees_count: number;
  avg_completion_pct: number;
  total_completed: number;
  alert_count: number;
}

export interface ReportAlertSlice {
  key: "ok" | "weak_pct" | "overdue" | "no_tasks" | string;
  count: number;
}

export interface ReportDailyPoint {
  day: string;
  assigned_count: number;
  completed_count: number;
  completion_pct: number;
}

export interface ReportBranchRow {
  branch_id: string;
  branch_name: string;
  assigned_count: number;
  completed_count: number;
  overdue_count: number;
  completion_pct: number;
}

export interface EmployeeWorkReportCharts {
  alert_breakdown: ReportAlertSlice[];
  daily_series: ReportDailyPoint[];
  by_branch: ReportBranchRow[];
}

export interface EmployeeWorkReport {
  period: ReportPeriod;
  due_from: string;
  due_to: string;
  branch_id: string | null;
  branch_name: string | null;
  network_wide?: boolean;
  summary: EmployeeWorkReportSummary;
  charts?: EmployeeWorkReportCharts;
  employees: EmployeeWorkReportRow[];
}

export type AttendanceAnomalyCode =
  | "missing_clock_in"
  | "missing_clock_out"
  | "inverted"
  | "overlap"
  | "open_break"
  | "idle"
  | string;

export interface AttendanceAnomaly {
  code: AttendanceAnomalyCode;
  day: string;
}

export interface AttendanceDayRow {
  day: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  worked_minutes: number | null;
  overtime_minutes: number;
  idle_count: number;
  anomalies: AttendanceAnomalyCode[];
}

export interface AttendanceEmployeeRow {
  user_id: string;
  full_name: string;
  job_function: string | null;
  branch_id: string | null;
  branch_name: string | null;
  is_active: boolean;
  clock_in: string | null;
  clock_out: string | null;
  worked_minutes: number;
  overtime_minutes: number;
  break_minutes: number;
  days_present: number;
  idle_count: number;
  anomalies: AttendanceAnomaly[];
  days: AttendanceDayRow[];
}

export interface AttendanceReportSummary {
  employees_count: number;
  total_worked_minutes: number;
  total_overtime_minutes: number;
  total_break_minutes: number;
  alert_count: number;
}

export interface AttendanceReport {
  period: ReportPeriod;
  due_from: string;
  due_to: string;
  branch_id: string | null;
  branch_name: string | null;
  network_wide?: boolean;
  summary: AttendanceReportSummary;
  employees: AttendanceEmployeeRow[];
}

export const reportService = {
  teamEmployees: async (params: { branch_id?: string; period?: ReportPeriod }) => {
    const query: { branch_id?: string; period?: ReportPeriod } = { period: params.period };
    if (params.branch_id) query.branch_id = params.branch_id;
    const response = await api.get<EmployeeWorkReport>("/reports/employees", { params: query });
    return response.data;
  },
  teamAttendance: async (params: { branch_id?: string; period?: ReportPeriod }) => {
    const query: { branch_id?: string; period?: ReportPeriod } = { period: params.period };
    if (params.branch_id) query.branch_id = params.branch_id;
    const response = await api.get<AttendanceReport>("/reports/attendance", { params: query });
    return response.data;
  },
};
