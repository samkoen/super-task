import { Box, LinearProgress, Typography } from "@mui/material";
import { he } from "../../i18n/he";

export function shiftStatusLabel(onBreak: boolean, onShift: boolean): string {
  if (onBreak) return he.employeeOnBreak;
  if (onShift) return he.employeeOnShift;
  return he.employeeOffShift;
}

export function EmployeeShiftProgress({ progress }: { progress: number }) {
  return (
    <Box display="flex" alignItems="center" gap={1} mt={1}>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label={he.employeeDailyProgress}
        sx={{ flex: 1, height: 6, borderRadius: 4 }}
      />
      <Typography variant="caption" fontWeight={800}>
        {progress}%
      </Typography>
    </Box>
  );
}
