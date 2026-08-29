import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import {
  reportService,
  type AttendanceReport,
  type EmployeeWorkReport,
  type ReportPeriod,
} from "../../services/reportService";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import ManagerReportCharts from "../../components/reports/ManagerReportCharts";
import ManagerAttendanceTable from "../../components/reports/ManagerAttendanceTable";
import { he } from "../../i18n/he";
import type { JobFunction } from "../../services/api";
import { formatDurationMinutes } from "../../utils/attendanceFormat";
import {
  parseBranchFromSearch,
  writeManagerScopeBranchId,
} from "../../utils/managerScopeBranch";
import { useSearchParams } from "react-router-dom";

const PERIODS: ReportPeriod[] = ["today", "7d", "30d"];
const ALL_NETWORK = "";
type ReportTab = "tasks" | "attendance";

function pctLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function jobLabel(value: string | null): string {
  if (!value) return "—";
  const labels = he.jobFunctionLabels as Record<string, string>;
  return labels[value as JobFunction] ?? value;
}

function formatAvgMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} ${he.reportMinutes}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}${he.reportHoursShort} ${m}${he.reportMinutesShort}` : `${h}${he.reportHoursShort}`;
}

export default function ManagerReportsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [tab, setTab] = useState<ReportTab>("tasks");
  const [branchId, setBranchId] = useState(() => {
    if (!(user?.role === "network_manager" || user?.role === "admin")) {
      return user?.branch_id || "";
    }
    return parseBranchFromSearch(searchParams) || ALL_NETWORK;
  });
  const [data, setData] = useState<EmployeeWorkReport | null>(null);
  const [attendance, setAttendance] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const scopeBranch = canPickBranch ? branchId : user?.branch_id || branchId;

  const load = useCallback(async () => {
    if (!canPickBranch && !scopeBranch) {
      setLoading(false);
      setError(he.reportNeedBranch);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (scopeBranch) writeManagerScopeBranchId(scopeBranch);
      const query = {
        ...(scopeBranch ? { branch_id: scopeBranch } : {}),
        period,
      };
      if (tab === "attendance") {
        setAttendance(await reportService.teamAttendance(query));
        setData(null);
      } else {
        setData(await reportService.teamEmployees(query));
        setAttendance(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
      setData(null);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  }, [canPickBranch, scopeBranch, period, tab]);

  useEffect(() => {
    if (!canPickBranch) return;
    branchService.list().then(setBranches).catch(() => setBranches([]));
  }, [canPickBranch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canPickBranch) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (branchId) next.set("branch", branchId);
        else next.delete("branch");
        return next;
      },
      { replace: true }
    );
  }, [branchId, canPickBranch, setSearchParams]);

  const summary = data?.summary;
  const attendanceSummary = attendance?.summary;
  const scopeLabel =
    data?.branch_name ||
    attendance?.branch_name ||
    (data?.network_wide || attendance?.network_wide ? he.reportAllNetwork : "");
  const subtitle =
    tab === "attendance" ? he.attendanceSubtitle : he.managerReportsSubtitle;
  const durationLabels = { hours: he.reportHoursShort, minutes: he.reportMinutesShort };

  return (
    <Box>
      <PageHeader
        title={he.managerReports}
        subtitle={scopeLabel ? `${subtitle} · ${scopeLabel}` : subtitle}
      />

      <Tabs
        value={tab}
        onChange={(_, value: ReportTab) => setTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab value="tasks" label={he.reportTabTasks} />
        <Tab value="attendance" label={he.reportTabAttendance} />
      </Tabs>

      <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
        <TextField
          select
          size="small"
          label={he.reportPeriod}
          value={period}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
          sx={{ minWidth: 160 }}
        >
          {PERIODS.map((p) => (
            <MenuItem key={p} value={p}>
              {he.reportPeriodLabels[p]}
            </MenuItem>
          ))}
        </TextField>
        {canPickBranch && (
          <TextField
            select
            size="small"
            label={he.branch}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value={ALL_NETWORK}>{he.reportAllNetwork}</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {summary && tab === "tasks" && (
        <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
          <Chip label={`${he.reportAvgCompletion}: ${pctLabel(summary.avg_completion_pct)}`} />
          <Chip label={`${he.reportTotalCompleted}: ${summary.total_completed}`} />
          <Chip
            color={summary.alert_count > 0 ? "warning" : "default"}
            label={`${he.reportAlerts}: ${summary.alert_count}`}
          />
        </Box>
      )}

      {attendanceSummary && tab === "attendance" && (
        <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
          <Chip
            label={`${he.attendanceTotalHours}: ${formatDurationMinutes(attendanceSummary.total_worked_minutes, durationLabels)}`}
          />
          <Chip
            label={`${he.attendanceTotalOvertime}: ${formatDurationMinutes(attendanceSummary.total_overtime_minutes, durationLabels)}`}
          />
          <Chip
            color={attendanceSummary.alert_count > 0 ? "warning" : "default"}
            label={`${he.attendanceAlertEmployees}: ${attendanceSummary.alert_count}`}
          />
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : tab === "attendance" ? (
        attendance && <ManagerAttendanceTable report={attendance} />
      ) : (
        <>
          {data && <ManagerReportCharts report={data} />}
          <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{he.fullName}</TableCell>
                <TableCell>{he.branch}</TableCell>
                <TableCell>{he.jobFunction}</TableCell>
                <TableCell align="center">{he.reportAssigned}</TableCell>
                <TableCell align="center">{he.reportCompleted}</TableCell>
                <TableCell align="center">{he.reportCompletionPct}</TableCell>
                <TableCell align="center">{he.reportOverdue}</TableCell>
                <TableCell align="center">{he.reportAvgDuration}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!data?.employees.length ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    {he.reportNoEmployees}
                  </TableCell>
                </TableRow>
              ) : (
                data.employees.map((row) => {
                  const weak =
                    row.assigned_count > 0 &&
                    (row.completion_pct < 0.5 || row.overdue_count > 0);
                  return (
                    <TableRow key={row.user_id} hover selected={weak}>
                      <TableCell>
                        <Typography fontWeight={600}>{row.full_name}</Typography>
                      </TableCell>
                      <TableCell>{row.branch_name || "—"}</TableCell>
                      <TableCell>{jobLabel(row.job_function)}</TableCell>
                      <TableCell align="center">{row.assigned_count}</TableCell>
                      <TableCell align="center">{row.completed_count}</TableCell>
                      <TableCell align="center">{pctLabel(row.completion_pct)}</TableCell>
                      <TableCell align="center">{row.overdue_count}</TableCell>
                      <TableCell align="center">
                        {formatAvgMinutes(row.avg_completion_minutes)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </>
      )}
    </Box>
  );
}
