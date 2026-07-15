import { Box, Button, IconButton, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { he } from "../../i18n/he";
import { formatHebrewDay, isToday, shiftDay, todayIso } from "../../utils/dateView";

export interface ManagerDayNavProps {
  day: string;
  onDayChange: (iso: string) => void;
}

export default function ManagerDayNav({ day, onDayChange }: ManagerDayNavProps) {
  const goToday = () => onDayChange(todayIso());

  return (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
      <IconButton size="small" aria-label={he.dashboardYesterday} onClick={() => onDayChange(shiftDay(day, -1))}>
        <ChevronRightIcon />
      </IconButton>
      <Button
        size="small"
        variant={isToday(day) ? "contained" : "outlined"}
        onClick={goToday}
        sx={{ minWidth: 72 }}
      >
        {he.tasksTodayLabel}
      </Button>
      <IconButton size="small" aria-label={he.dashboardTomorrow} onClick={() => onDayChange(shiftDay(day, 1))}>
        <ChevronLeftIcon />
      </IconButton>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {formatHebrewDay(day)}
      </Typography>
    </Box>
  );
}
