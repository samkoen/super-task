import type { ChangeEvent } from "react";
import { Box, ButtonBase, MenuItem, TextField, Typography } from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import type { TaskRecurrence } from "../../../../services/taskService";
import { he } from "../../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../../styles/flowTokens";
import {
  FIXED_RECURRENCE_OPTIONS,
  joinWeeklyDays,
  parseWeeklyDays,
  usesWeeklyDays,
  WEEKDAY_OPTIONS,
  weekdaysOnRecurrenceChange,
} from "../../../../utils/taskRecurrence";
import { studioFieldSx, studioPillSx } from "./studioUi";

export type StudioScheduleValue = {
  recurrence: TaskRecurrence;
  dueTime: string;
  weeklyDays: string;
  monthlyDay: number;
};

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function RecurrencePills({ value, onChange, disabled }: { value: StudioScheduleValue; onChange: (patch: Partial<StudioScheduleValue>) => void; disabled?: boolean }) {
  return (
    <Box role="radiogroup" aria-label={he.recurrence} sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {FIXED_RECURRENCE_OPTIONS.map((option) => {
        const selected = value.recurrence === option;
        return (
          <ButtonBase
            key={option}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange({ recurrence: option, weeklyDays: weekdaysOnRecurrenceChange(option, value.weeklyDays) })}
            sx={studioPillSx(selected)}
          >
            {he.recurrenceLabels[option]}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** Jours en ronds (א׳ … ש׳) : plusieurs pour « יומית », un seul pour « שבועית ». */
function WeekdayCircles({ value, exclusive, onChange, disabled }: { value: string; exclusive: boolean; onChange: (days: string) => void; disabled?: boolean }) {
  const selected = parseWeeklyDays(value);
  const toggle = (day: string) => {
    if (exclusive) return onChange(day);
    const next = selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day];
    if (next.length === 0) return;
    onChange(joinWeeklyDays(next));
  };
  return (
    <Box role="group" aria-label={exclusive ? he.weekday : he.weekdays} sx={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
      {WEEKDAY_OPTIONS.map((day) => {
        const on = selected.includes(day.value);
        return (
          <ButtonBase
            key={day.value}
            aria-label={day.label}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => toggle(day.value)}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `1px solid ${on ? flowColor.navy800 : flowColor.neutral300}`,
              bgcolor: on ? flowColor.navy800 : flowColor.neutral0,
              color: on ? flowColor.neutral0 : flowColor.neutral900,
              ...flowText.label,
              fontSize: 14,
            }}
          >
            {he.studioWeekdayShort[day.value] ?? day.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** Grande heure, comme « בשעה 6:30 » de l'en-tête oved. */
function TimeField({ value, onChange, disabled }: { value: string; onChange: (time: string) => void; disabled?: boolean }) {
  return (
    <Box
      component="label"
      sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: "16px", height: 64, borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral100 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <AccessTimeRoundedIcon sx={{ color: flowColor.navy800 }} />
        <Typography sx={{ ...flowText.bodyLarge, color: flowColor.navy800 }}>{he.studioTime}</Typography>
      </Box>
      <Box
        component="input"
        type="time"
        value={value}
        disabled={disabled}
        aria-label={he.dueTime}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        sx={{ border: 0, outline: 0, bgcolor: "transparent", direction: "ltr", ...flowText.h1, color: flowColor.neutral900, width: 120, textAlign: "left" }}
      />
    </Box>
  );
}

/** Section « מתי » : fréquence, jours, heure. En édition, la fréquence est fixe (`recurrenceLocked`). */
export default function StudioSchedule({
  value,
  onChange,
  recurrenceLocked = false,
  disabled = false,
}: {
  value: StudioScheduleValue;
  onChange: (patch: Partial<StudioScheduleValue>) => void;
  recurrenceLocked?: boolean;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {recurrenceLocked ? (
        <Box>
          <Typography sx={{ ...flowText.button, color: flowColor.navy800 }}>{he.recurrenceLabels[value.recurrence]}</Typography>
          <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{he.studioRecurrenceLocked}</Typography>
        </Box>
      ) : (
        <RecurrencePills value={value} onChange={onChange} disabled={disabled} />
      )}
      {usesWeeklyDays(value.recurrence) ? (
        <WeekdayCircles
          value={value.weeklyDays}
          exclusive={value.recurrence === "weekly"}
          onChange={(weeklyDays) => onChange({ weeklyDays })}
          disabled={disabled}
        />
      ) : null}
      {value.recurrence === "monthly" ? (
        <TextField
          select
          label={he.monthlyDay}
          value={String(value.monthlyDay)}
          disabled={disabled || recurrenceLocked}
          onChange={(e) => onChange({ monthlyDay: Number(e.target.value) })}
          sx={studioFieldSx}
          fullWidth
        >
          {MONTH_DAYS.map((day) => (
            <MenuItem key={day} value={String(day)}>{day}</MenuItem>
          ))}
        </TextField>
      ) : null}
      <TimeField value={value.dueTime} onChange={(dueTime) => onChange({ dueTime })} disabled={disabled} />
    </Box>
  );
}
