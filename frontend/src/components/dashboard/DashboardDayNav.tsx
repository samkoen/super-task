import type { MouseEvent } from "react";
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
  return (
    <Box display="flex" alignItems="center" gap={0.25} mb={0.75}>
      <IconButton size="small" aria-label={he.tasksPreviousDay} onClick={() => onChange(shiftDay(day, -1))}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
      <Typography variant="caption" color="text.secondary">
        {formatHebrewDay(day)}
      </Typography>
      <DayPickerButton day={day} onChange={onChange} />
      <IconButton size="small" aria-label={he.tasksNextDay} onClick={() => onChange(shiftDay(day, 1))}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function DayPickerButton({ day, onChange }: { day: string; onChange: (iso: string) => void }) {
  return (
    <Box sx={{ position: "relative", width: 40, height: 40, flex: "0 0 auto" }}>
      <IconButton size="small" tabIndex={-1} aria-hidden sx={{ width: 40, height: 40, pointerEvents: "none" }}>
        <CalendarMonthIcon fontSize="small" />
      </IconButton>
      <Box
        component="input"
        type="date"
        value={day}
        dir="ltr"
        aria-label={he.dashboardPickDay}
        onClick={openDayPicker}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          width: "100%",
          height: "100%",
          minWidth: 0,
          maxWidth: "100%",
          m: 0,
          p: 0,
          opacity: 0,
          border: 0,
          cursor: "pointer",
          fontSize: 16,
        }}
      />
    </Box>
  );
}

function openDayPicker(event: MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
    event.preventDefault();
  } catch {
    // WebView Android : le tap sur l'input ouvre déjà le calendrier natif.
  }
}
