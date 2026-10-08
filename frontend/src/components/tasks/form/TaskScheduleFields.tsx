import { useMemo } from "react";
import { MenuItem, TextField, Typography } from "@mui/material";
import { he } from "../../../i18n/he";
import { EMPLOYEE_BRAND, employeeFieldSx } from "../../../styles/employeeUi";
import type { TaskRecurrence, TaskTemplate } from "../../../services/taskService";
import { followUpPresets, formatFollowUpPreview } from "../../../utils/chatTaskFollowUp";
import { formatTemplateSchedule } from "../../../utils/fixedTaskTemplates";
import { FIXED_RECURRENCE_OPTIONS, weekdaysOnRecurrenceChange } from "../../../utils/taskRecurrence";
import QuickTimePresets from "../../ui/QuickTimePresets";
import WeekdayMultiSelect from "../WeekdayMultiSelect";
import type { TaskKind } from "./TaskKindPicker";

export interface TaskScheduleValue {
  dueAt: string;
  recurrence: TaskRecurrence;
  dueTime: string;
  weeklyDays: string;
  monthlyDay: number;
}

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Phrase lisible qui résume la récurrence choisie (ex. « יומית · א׳, ב׳ · 09:00 »). */
export function scheduleSummary(value: TaskScheduleValue): string {
  return formatTemplateSchedule({
    recurrence: value.recurrence,
    due_time: value.dueTime,
    weekly_days: value.weeklyDays,
    monthly_day: value.monthlyDay,
  } as unknown as TaskTemplate);
}

function AdHocFields({
  value,
  onChange,
  disabled,
}: {
  value: TaskScheduleValue;
  onChange: (patch: Partial<TaskScheduleValue>) => void;
  disabled: boolean;
}) {
  const presets = useMemo(() => followUpPresets(new Date()), []);
  const preview = formatFollowUpPreview(value.dueAt);
  return (
    <>
      <QuickTimePresets
        presets={presets}
        selected={value.dueAt}
        onPick={(dueAt) => onChange({ dueAt })}
        disabled={disabled}
        row
      />
      <TextField
        label={he.dueAt}
        type="datetime-local"
        value={value.dueAt}
        onChange={(e) => onChange({ dueAt: e.target.value })}
        InputLabelProps={{ shrink: true }}
        required
        fullWidth
        dir="ltr"
        sx={employeeFieldSx}
      />
      {preview ? (
        <Typography fontWeight={800} sx={{ color: EMPLOYEE_BRAND }} data-testid="due-preview">
          {he.taskDueSummary(preview)}
        </Typography>
      ) : null}
    </>
  );
}

function FixedFields({
  value,
  onChange,
  disabled,
}: {
  value: TaskScheduleValue;
  onChange: (patch: Partial<TaskScheduleValue>) => void;
  disabled: boolean;
}) {
  const { recurrence } = value;
  return (
    <>
      <TextField
        select
        label={he.recurrence}
        value={recurrence}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value as TaskRecurrence;
          onChange({ recurrence: next, weeklyDays: weekdaysOnRecurrenceChange(next, value.weeklyDays) });
        }}
        fullWidth
        sx={employeeFieldSx}
      >
        {FIXED_RECURRENCE_OPTIONS.map((r) => (
          <MenuItem key={r} value={r}>{he.recurrenceLabels[r]}</MenuItem>
        ))}
      </TextField>
      {recurrence === "daily" || recurrence === "weekly" ? (
        <WeekdayMultiSelect
          value={value.weeklyDays}
          onChange={(weeklyDays) => onChange({ weeklyDays })}
          exclusive={recurrence === "weekly"}
        />
      ) : null}
      {recurrence === "monthly" ? (
        <TextField
          select
          label={he.monthlyDay}
          value={String(value.monthlyDay)}
          disabled={disabled}
          onChange={(e) => onChange({ monthlyDay: Number(e.target.value) })}
          fullWidth
          sx={employeeFieldSx}
        >
          {MONTH_DAYS.map((day) => (
            <MenuItem key={day} value={String(day)}>{day}</MenuItem>
          ))}
        </TextField>
      ) : null}
      <TextField
        label={he.dueTime}
        type="time"
        value={value.dueTime}
        onChange={(e) => onChange({ dueTime: e.target.value })}
        InputLabelProps={{ shrink: true }}
        disabled={disabled}
        fullWidth
        dir="ltr"
        sx={employeeFieldSx}
      />
      <Typography fontWeight={800} sx={{ color: EMPLOYEE_BRAND }} data-testid="schedule-summary">
        {he.taskScheduleSummary(scheduleSummary(value))}
      </Typography>
    </>
  );
}

/** « Quand » : raccourcis + date pour une tâche ponctuelle, récurrence + résumé pour une fixe. */
export default function TaskScheduleFields({
  taskKind,
  toGallery,
  value,
  onChange,
  disabled = false,
}: {
  taskKind: TaskKind;
  /** Assignée à la galerie : pas d'échéance. */
  toGallery: boolean;
  value: TaskScheduleValue;
  onChange: (patch: Partial<TaskScheduleValue>) => void;
  disabled?: boolean;
}) {
  if (taskKind === "fixed") return <FixedFields value={value} onChange={onChange} disabled={disabled} />;
  if (toGallery) return null;
  return <AdHocFields value={value} onChange={onChange} disabled={disabled} />;
}
