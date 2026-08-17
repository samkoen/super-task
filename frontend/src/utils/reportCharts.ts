import type {
  EmployeeWorkReportCharts,
  EmployeeWorkReportRow,
} from "../services/reportService";
import { he } from "../i18n/he";

export type AlertSliceKey = "ok" | "weak_pct" | "overdue" | "no_tasks";

const ALERT_LABELS: Record<AlertSliceKey, string> = {
  ok: he.reportChartAlertOk,
  weak_pct: he.reportChartAlertWeak,
  overdue: he.reportChartAlertOverdue,
  no_tasks: he.reportChartAlertNoTasks,
};

export function employeeCompletionBars(rows: EmployeeWorkReportRow[]) {
  return rows
    .filter((r) => r.assigned_count > 0)
    .map((r) => ({
      name: r.full_name,
      pct: Math.round(r.completion_pct * 100),
      weak: r.completion_pct < 0.5 || r.overdue_count > 0,
    }));
}

export function employeeVolumeBars(rows: EmployeeWorkReportRow[]) {
  return rows
    .filter((r) => r.assigned_count > 0)
    .map((r) => ({
      name: r.full_name,
      assigned: r.assigned_count,
      completed: r.completed_count,
    }));
}

export function alertPieSlices(charts: EmployeeWorkReportCharts | undefined) {
  return (charts?.alert_breakdown ?? []).map((s) => ({
    key: s.key,
    name: ALERT_LABELS[s.key as AlertSliceKey] ?? s.key,
    value: s.count,
  }));
}

export function dailyTrendPoints(charts: EmployeeWorkReportCharts | undefined) {
  return (charts?.daily_series ?? []).map((p) => ({
    day: p.day.slice(5), // MM-DD
    pct: Math.round(p.completion_pct * 100),
    assigned: p.assigned_count,
  }));
}

export function branchBars(charts: EmployeeWorkReportCharts | undefined) {
  return (charts?.by_branch ?? []).map((b) => ({
    name: b.branch_name,
    pct: Math.round(b.completion_pct * 100),
    overdue: b.overdue_count,
  }));
}

export function durationScatterPoints(rows: EmployeeWorkReportRow[]) {
  return rows
    .filter((r) => r.assigned_count > 0 && r.avg_completion_minutes != null)
    .map((r) => ({
      name: r.full_name,
      pct: Math.round(r.completion_pct * 100),
      minutes: r.avg_completion_minutes as number,
    }));
}
