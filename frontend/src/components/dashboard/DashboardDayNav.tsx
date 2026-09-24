import { useRef } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { he } from "../../i18n/he";
import { formatHebrewDay, shiftDay } from "../../utils/dateView";

export default function DashboardDayNav({
  day,
  onChange,
}: {
  day: string;
  onChange: (iso: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };
  return (
    <Box display="flex" alignItems="center" gap={0.25} mb={0.75}>
      <IconButton size="small" aria-label={he.tasksPreviousDay} onClick={() => onChange(shiftDay(day, -1))}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
      <Typography variant="caption" color="text.secondary">
        {formatHebrewDay(day)}
      </Typography>
      <IconButton size="small" aria-label={he.dashboardPickDay} onClick={openPicker}>
        <CalendarMonthIcon fontSize="small" />
      </IconButton>
      <Box
        component="input"
        ref={inputRef}
        type="date"
        value={day}
        aria-label={he.tasksViewDay}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        sx={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      />
      <IconButton size="small" aria-label={he.tasksNextDay} onClick={() => onChange(shiftDay(day, 1))}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
