import { describe, expect, it } from "vitest";
import {
  alertPieSlices,
  branchBars,
  dailyTrendPoints,
  durationScatterPoints,
  employeeCompletionBars,
  employeeVolumeBars,
} from "./reportCharts";
import type { EmployeeWorkReportCharts, EmployeeWorkReportRow } from "../services/reportService";

function row(partial: Partial<EmployeeWorkReportRow>): EmployeeWorkReportRow {
  return {
    user_id: "u1",
    full_name: "עובד",
    job_function: null,
    branch_id: "b1",
    branch_name: "מרכז",
    is_active: true,
    assigned_count: 2,
    completed_count: 1,
    completion_pct: 0.5,
    overdue_count: 0,
    avg_completion_minutes: 20,
    last_activity_at: null,
    ...partial,
  };
}

describe("reportCharts", () => {
  it("builds completion and volume bars for assigned employees", () => {
    const rows = [
      row({ full_name: "א", assigned_count: 2, completion_pct: 0.4, overdue_count: 1 }),
      row({ user_id: "u2", full_name: "ב", assigned_count: 0 }),
    ];
    expect(employeeCompletionBars(rows)).toEqual([
      { name: "א", pct: 40, weak: true },
    ]);
    expect(employeeVolumeBars(rows)[0]).toMatchObject({ assigned: 2, completed: 1 });
  });

  it("maps alert / daily / branch chart payloads", () => {
    const charts: EmployeeWorkReportCharts = {
      alert_breakdown: [{ key: "ok", count: 3 }, { key: "overdue", count: 1 }],
      daily_series: [
        { day: "2026-08-16", assigned_count: 2, completed_count: 2, completion_pct: 1 },
      ],
      by_branch: [
        {
          branch_id: "b1",
          branch_name: "מרכז",
          assigned_count: 4,
          completed_count: 2,
          overdue_count: 1,
          completion_pct: 0.5,
        },
      ],
    };
    expect(alertPieSlices(charts)[0].value).toBe(3);
    expect(dailyTrendPoints(charts)[0]).toEqual({ day: "08-16", pct: 100, assigned: 2 });
    expect(branchBars(charts)[0].pct).toBe(50);
  });

  it("scatter skips rows without avg duration", () => {
    const rows = [
      row({ avg_completion_minutes: null }),
      row({ user_id: "u2", full_name: "ג", avg_completion_minutes: 15, completion_pct: 0.8 }),
    ];
    expect(durationScatterPoints(rows)).toEqual([{ name: "ג", pct: 80, minutes: 15 }]);
  });
});
