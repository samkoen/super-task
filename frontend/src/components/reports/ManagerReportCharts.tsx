import type { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { EmployeeWorkReport } from "../../services/reportService";
import { he } from "../../i18n/he";
import {
  alertPieSlices,
  branchBars,
  dailyTrendPoints,
  durationScatterPoints,
  employeeCompletionBars,
  employeeVolumeBars,
} from "../../utils/reportCharts";

const COLORS = {
  ok: "#2e7d32",
  weak: "#ed6c02",
  overdue: "#d32f2f",
  noTasks: "#90a4ae",
  primary: "#1565c0",
  secondary: "#00838f",
};

const PIE_COLORS: Record<string, string> = {
  ok: COLORS.ok,
  weak_pct: COLORS.weak,
  overdue: COLORS.overdue,
  no_tasks: COLORS.noTasks,
};

function ChartCard({ title, height = 280, children }: { title: string; height?: number; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        {title}
      </Typography>
      <Box sx={{ width: "100%", height, direction: "ltr" }}>{children}</Box>
    </Paper>
  );
}

type Props = { report: EmployeeWorkReport };

export default function ManagerReportCharts({ report }: Props) {
  const employees = report.employees;
  const completion = employeeCompletionBars(employees);
  const volume = employeeVolumeBars(employees);
  const alerts = alertPieSlices(report.charts);
  const daily = dailyTrendPoints(report.charts);
  const branches = branchBars(report.charts);
  const scatter = durationScatterPoints(employees);
  const showBranchChart = branches.length > 1 || Boolean(report.network_wide);
  const showDaily = daily.length > 1;

  if (!employees.length) return null;

  return (
    <Box
      display="grid"
      gap={2}
      mb={2}
      gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
    >
      <ChartCard title={he.reportChartCompletionByEmployee} height={Math.max(220, completion.length * 28)}>
        <ResponsiveContainer>
          <BarChart data={completion} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, he.reportChartPctAxis]} />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
              {completion.map((row) => (
                <Cell key={row.name} fill={row.weak ? COLORS.weak : COLORS.primary} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={he.reportChartVolumeByEmployee} height={Math.max(220, volume.length * 28)}>
        <ResponsiveContainer>
          <BarChart data={volume} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="assigned" name={he.reportAssigned} fill={COLORS.secondary} />
            <Bar dataKey="completed" name={he.reportCompleted} fill={COLORS.ok} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={he.reportChartAlertBreakdown}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={alerts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {alerts.map((s) => (
                <Cell key={s.key} fill={PIE_COLORS[s.key] || COLORS.primary} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {showDaily && (
        <ChartCard title={he.reportChartDailyTrend}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, he.reportChartPctAxis]} />
              <Line type="monotone" dataKey="pct" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {showBranchChart && (
        <ChartCard title={he.reportChartByBranch}>
          <ResponsiveContainer>
            <BarChart data={branches} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, he.reportChartPctAxis]} />
              <Bar dataKey="pct" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {scatter.length > 0 && (
        <ChartCard title={he.reportChartDurationScatter}>
          <ResponsiveContainer>
            <ScatterChart margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="pct" name={he.reportChartPctAxis} domain={[0, 100]} unit="%" />
              <YAxis type="number" dataKey="minutes" name={he.reportChartMinutesAxis} unit="ד׳" />
              <ZAxis range={[60, 60]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatter} fill={COLORS.primary} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </Box>
  );
}
