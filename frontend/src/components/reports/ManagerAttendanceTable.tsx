import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { he } from "../../i18n/he";
import type { AttendanceReport } from "../../services/reportService";
import { formatTime } from "../../utils/dashboardTime";
import { formatDurationMinutes, uniqueAnomalyCodes } from "../../utils/attendanceFormat";
import type { JobFunction } from "../../services/api";

function jobLabel(value: string | null): string {
  if (!value) return "—";
  const labels = he.jobFunctionLabels as Record<string, string>;
  return labels[value as JobFunction] ?? value;
}

function clockLabel(iso: string | null): string {
  return iso ? formatTime(iso) : "—";
}

function durationLabel(minutes: number): string {
  return formatDurationMinutes(minutes, {
    hours: he.reportHoursShort,
    minutes: he.reportMinutesShort,
  });
}

function anomalyLabel(code: string): string {
  const labels = he.attendanceAnomalyLabels as Record<string, string>;
  return labels[code] ?? code;
}

interface ManagerAttendanceTableProps {
  report: AttendanceReport;
}

export default function ManagerAttendanceTable({ report }: ManagerAttendanceTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{he.fullName}</TableCell>
            <TableCell>{he.branch}</TableCell>
            <TableCell>{he.jobFunction}</TableCell>
            <TableCell align="center">{he.attendanceClockIn}</TableCell>
            <TableCell align="center">{he.attendanceClockOut}</TableCell>
            <TableCell align="center">{he.attendanceHours}</TableCell>
            <TableCell align="center">{he.attendanceOvertime}</TableCell>
            <TableCell align="center">{he.attendanceBreaks}</TableCell>
            <TableCell>{he.attendanceAnomalies}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!report.employees.length ? (
            <TableRow>
              <TableCell colSpan={9} align="center">
                {he.reportNoEmployees}
              </TableCell>
            </TableRow>
          ) : (
            report.employees.map((row) => {
              const codes = uniqueAnomalyCodes(row.anomalies);
              return (
                <TableRow key={row.user_id} hover selected={codes.length > 0}>
                  <TableCell>
                    <Typography fontWeight={600}>{row.full_name}</Typography>
                  </TableCell>
                  <TableCell>{row.branch_name || "—"}</TableCell>
                  <TableCell>{jobLabel(row.job_function)}</TableCell>
                  <TableCell align="center">{clockLabel(row.clock_in)}</TableCell>
                  <TableCell align="center">{clockLabel(row.clock_out)}</TableCell>
                  <TableCell align="center">{durationLabel(row.worked_minutes)}</TableCell>
                  <TableCell align="center">{durationLabel(row.overtime_minutes)}</TableCell>
                  <TableCell align="center">{durationLabel(row.break_minutes)}</TableCell>
                  <TableCell>
                    {codes.length
                      ? codes.map((code) => (
                          <Chip
                            key={code}
                            size="small"
                            color="warning"
                            label={anomalyLabel(code)}
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
