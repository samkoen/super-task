import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import {
  joinWeeklyDays,
  parseWeeklyDays,
  WEEKDAY_OPTIONS,
  weekdaysForPicker,
} from "../../utils/taskRecurrence";

interface WeekdayMultiSelectProps {
  value: string;
  onChange: (next: string) => void;
  exclusive?: boolean;
}

function weekdayButtons() {
  return WEEKDAY_OPTIONS.map((day) => (
    <ToggleButton key={day.value} value={day.value} sx={{ px: 1.25 }}>
      {day.label}
    </ToggleButton>
  ));
}

/** En RTL, MUI arrondit encore le 1er bouton à gauche : on inverse pour ראשון / שבת. */
export const WEEKDAY_GROUP_SX = {
  flexWrap: "wrap",
  gap: 0.5,
  "&& .MuiToggleButtonGroup-firstButton": {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: "10px",
    borderBottomRightRadius: "10px",
  },
  "&& .MuiToggleButtonGroup-lastButton": {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: "10px",
    borderBottomLeftRadius: "10px",
  },
  "&& .MuiToggleButtonGroup-middleButton": {
    borderRadius: 0,
  },
} as const;

function WeekdayManyGroup({ value, onChange }: Omit<WeekdayMultiSelectProps, "exclusive">) {
  const handleMany = (_: unknown, next: string[]) => {
    if (!next.length) return;
    onChange(joinWeeklyDays(next));
  };
  return (
    <ToggleButtonGroup
      value={weekdaysForPicker(value)}
      onChange={handleMany}
      aria-label={he.weekdays}
      size="small"
      sx={WEEKDAY_GROUP_SX}
    >
      {weekdayButtons()}
    </ToggleButtonGroup>
  );
}

function WeekdayOneGroup({ value, onChange }: Omit<WeekdayMultiSelectProps, "exclusive">) {
  const selected = parseWeeklyDays(value)[0] || WEEKDAY_OPTIONS[0].value;
  const handleOne = (_: unknown, next: string | null) => {
    if (!next) return;
    onChange(next);
  };
  return (
    <ToggleButtonGroup
      exclusive
      value={selected}
      onChange={handleOne}
      aria-label={he.weekdays}
      size="small"
      sx={WEEKDAY_GROUP_SX}
    >
      {weekdayButtons()}
    </ToggleButtonGroup>
  );
}

/** Choix des jours — plusieurs (יומית) ou un seul (שבועית). */
export default function WeekdayMultiSelect({
  value,
  onChange,
  exclusive = false,
}: WeekdayMultiSelectProps) {
  return (
    <>
      <Typography variant="body2" fontWeight={600}>
        {he.weekdays}
      </Typography>
      {exclusive ? (
        <WeekdayOneGroup value={value} onChange={onChange} />
      ) : (
        <WeekdayManyGroup value={value} onChange={onChange} />
      )}
    </>
  );
}
