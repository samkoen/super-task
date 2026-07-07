import {
  Box,
  Button,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { he } from "../../i18n/he";
import {
  defaultRangeFrom,
  formatHebrewDay,
  formatHebrewDayShort,
  isToday,
  shiftDay,
  todayIso,
  type TaskDateViewMode,
  weekRangeAround,
} from "../../utils/dateView";

export interface TaskDateViewBarProps {
  mode: TaskDateViewMode;
  onModeChange: (mode: TaskDateViewMode) => void;
  day: string;
  onDayChange: (iso: string) => void;
  rangeFrom: string;
  rangeTo: string;
  onRangeChange: (from: string, to: string) => void;
}

export default function TaskDateViewBar({
  mode,
  onModeChange,
  day,
  onDayChange,
  rangeFrom,
  rangeTo,
  onRangeChange,
}: TaskDateViewBarProps) {
  const applyWeek = () => {
    const { from, to } = weekRangeAround(todayIso());
    onRangeChange(from, to);
  };

  const applyNext7Days = () => {
    const { from, to } = defaultRangeFrom(todayIso(), 7);
    onRangeChange(from, to);
  };

  return (
    <Box mb={2}>
      <Tabs
        value={mode}
        onChange={(_, value: TaskDateViewMode) => onModeChange(value)}
        sx={{ mb: 1.5, minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0.5 } }}
      >
        <Tab value="day" label={he.tasksViewModeDay} />
        <Tab value="range" label={he.tasksViewModeRange} />
      </Tabs>

      {mode === "day" ? (
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
          <IconButton size="small" aria-label={he.tasksPreviousDay} onClick={() => onDayChange(shiftDay(day, -1))}>
            <ChevronRightIcon />
          </IconButton>
          <TextField
            type="date"
            size="small"
            label={he.tasksViewDay}
            value={day}
            onChange={(e) => e.target.value && onDayChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            dir="ltr"
            sx={{ width: 170 }}
          />
          <IconButton size="small" aria-label={he.tasksNextDay} onClick={() => onDayChange(shiftDay(day, 1))}>
            <ChevronLeftIcon />
          </IconButton>
          {!isToday(day) && (
            <Button size="small" variant="outlined" onClick={() => onDayChange(todayIso())}>
              {he.tasksToday}
            </Button>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 100%", minWidth: 200 }}>
            {isToday(day) ? he.tasksTodayLabel : formatHebrewDay(day)}
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
          <TextField
            type="date"
            size="small"
            label={he.tasksRangeFrom}
            value={rangeFrom}
            onChange={(e) => e.target.value && onRangeChange(e.target.value, rangeTo)}
            InputLabelProps={{ shrink: true }}
            dir="ltr"
            sx={{ width: 160 }}
          />
          <TextField
            type="date"
            size="small"
            label={he.tasksRangeTo}
            value={rangeTo}
            onChange={(e) => e.target.value && onRangeChange(rangeFrom, e.target.value)}
            InputLabelProps={{ shrink: true }}
            dir="ltr"
            sx={{ width: 160 }}
          />
          <Button size="small" variant="outlined" onClick={applyWeek}>{he.tasksThisWeek}</Button>
          <Button size="small" variant="outlined" onClick={applyNext7Days}>{he.tasksNext7Days}</Button>
          <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 100%", minWidth: 200 }}>
            {formatHebrewDayShort(rangeFrom)} – {formatHebrewDayShort(rangeTo)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
