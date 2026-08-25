import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import {
  joinWeeklyDays,
  WEEKDAY_OPTIONS,
  weekdaysForPicker,
} from "../../utils/taskRecurrence";

interface WeekdayMultiSelectProps {
  value: string;
  onChange: (next: string) => void;
}

/** Choix des jours pour משימה יומית. */
export default function WeekdayMultiSelect({ value, onChange }: WeekdayMultiSelectProps) {
  const selected = weekdaysForPicker(value);

  const handleChange = (_: unknown, next: string[]) => {
    if (!next.length) return;
    onChange(joinWeeklyDays(next));
  };

  return (
    <>
      <Typography variant="body2" fontWeight={600}>
        {he.weekdays}
      </Typography>
      <ToggleButtonGroup
        value={selected}
        onChange={handleChange}
        aria-label={he.weekdays}
        size="small"
        sx={{ flexWrap: "wrap", gap: 0.5 }}
      >
        {WEEKDAY_OPTIONS.map((day) => (
          <ToggleButton key={day.value} value={day.value} sx={{ px: 1.25 }}>
            {day.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </>
  );
}
