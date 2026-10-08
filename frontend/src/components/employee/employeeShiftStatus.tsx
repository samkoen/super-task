import { Box, LinearProgress, Typography, alpha } from "@mui/material";
import { he } from "../../i18n/he";

export function shiftStatusLabel(onBreak: boolean, onShift: boolean): string {
  if (onBreak) return he.employeeOnBreak;
  if (onShift) return he.employeeOnShift;
  return he.employeeOffShift;
}

interface EmployeeShiftProgressProps {
  progress: number;
  /** Fond sombre (carte hero) : barre blanche sur piste translucide. */
  onDark?: boolean;
  completed?: number;
  total?: number;
}

function progressCaption(completed?: number, total?: number): string | null {
  if (completed == null || total == null || total <= 0) return null;
  return `${he.employeeProgressOf(completed, total)} ${he.employeeProgressDoneLabel}`;
}

const darkBarSx = {
  height: 10,
  bgcolor: alpha("#fff", 0.22),
  "& .MuiLinearProgress-bar": { bgcolor: "#fff" },
} as const;

export function EmployeeShiftProgress({
  progress,
  onDark = false,
  completed,
  total,
}: EmployeeShiftProgressProps) {
  const caption = progressCaption(completed, total);
  return (
    <Box mt={onDark ? 0 : 1}>
      {caption ? (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ mb: 0.75, color: onDark ? alpha("#fff", 0.92) : "text.secondary" }}
        >
          {caption}
        </Typography>
      ) : null}
      <Box display="flex" alignItems="center" gap={1.25}>
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label={he.employeeDailyProgress}
          sx={onDark ? { flex: 1, ...darkBarSx } : { flex: 1, height: 6, borderRadius: 4 }}
        />
        <Typography
          variant={onDark ? "subtitle1" : "caption"}
          fontWeight={800}
          sx={{ color: onDark ? "#fff" : undefined, minWidth: 44, textAlign: "end" }}
        >
          {progress}%
        </Typography>
      </Box>
    </Box>
  );
}
