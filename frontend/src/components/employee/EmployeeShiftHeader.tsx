import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { EmployeeShiftProgress, shiftStatusLabel } from "./employeeShiftStatus";

interface EmployeeShiftHeaderProps {
  name?: string;
  meta?: string;
  onShift: boolean;
  onBreak: boolean;
  breakBusy?: boolean;
  progress?: number | null;
  onToggleBreak: () => void;
}

/** Barre présence compacte — pas un bloc 25% d’écran. */
export default function EmployeeShiftHeader({
  name,
  meta,
  onShift,
  onBreak,
  breakBusy = false,
  progress = null,
  onToggleBreak,
}: EmployeeShiftHeaderProps) {
  return (
    <Box mb={1.5}>
      <Paper
        variant="outlined"
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderRadius: 2,
        }}
      >
        <Box flex={1} minWidth={0}>
          <Typography variant="subtitle2" fontWeight={800} noWrap>
            {name}
          </Typography>
          {meta ? (
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {meta}
            </Typography>
          ) : null}
        </Box>
        <Chip
          size="small"
          color={onBreak ? "warning" : onShift ? "success" : "default"}
          label={shiftStatusLabel(onBreak, onShift)}
        />
        <Button
          size="small"
          variant={onBreak ? "contained" : "outlined"}
          color={onBreak ? "warning" : "primary"}
          disabled={breakBusy}
          onClick={onToggleBreak}
          sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {onBreak ? he.employeeBreakEnd : he.employeeBreakStart}
        </Button>
      </Paper>
      {progress != null ? <EmployeeShiftProgress progress={progress} /> : null}
    </Box>
  );
}
