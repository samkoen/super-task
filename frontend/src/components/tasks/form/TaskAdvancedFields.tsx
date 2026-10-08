import { Box, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import { he } from "../../../i18n/he";
import { employeeFieldSx } from "../../../styles/employeeUi";
import { OPS_CATEGORIES, type OpsCategory } from "../../../services/taskService";
import CollapsibleSection from "../../ui/CollapsibleSection";
import type { TaskKind } from "./TaskKindPicker";

export interface TaskAdvancedValue {
  startUrl: string;
  opsCategory: OpsCategory | "";
  isWorkStart: boolean;
  isWorkEnd: boolean;
}

function WorkMarkerCheckbox({
  checked,
  label,
  hint,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint: string;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <FormControlLabel
      control={<Checkbox checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />}
      label={
        <Box>
          <Typography fontWeight={700}>{label}</Typography>
          <Typography variant="body2" color="text.secondary">{hint}</Typography>
        </Box>
      }
      sx={{ alignItems: "flex-start", mx: 0, "& .MuiCheckbox-root": { p: 1.25 } }}
    />
  );
}

/** Réglages rarement utilisés, repliés par défaut : lien de départ, catégorie, début/fin de travail. */
export default function TaskAdvancedFields({
  taskKind,
  value,
  onChange,
  open,
  onOpenChange,
  disabled = false,
}: {
  taskKind: TaskKind;
  value: TaskAdvancedValue;
  onChange: (patch: Partial<TaskAdvancedValue>) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <CollapsibleSection label={he.taskAdvancedOptions} open={open} onOpenChange={onOpenChange}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}>
        <TextField
          label={he.startUrl}
          value={value.startUrl}
          onChange={(e) => onChange({ startUrl: e.target.value })}
          helperText={he.startUrlHint}
          fullWidth
          dir="ltr"
          sx={employeeFieldSx}
        />
        {taskKind === "fixed" ? (
          <>
            <TextField
              select
              label={he.opsCategory}
              value={value.opsCategory}
              onChange={(e) => onChange({ opsCategory: e.target.value as OpsCategory | "" })}
              fullWidth
              sx={employeeFieldSx}
            >
              <MenuItem value="">{he.opsCategoryNone}</MenuItem>
              {OPS_CATEGORIES.map((key) => (
                <MenuItem key={key} value={key}>{he.opsCategoryLabels[key]}</MenuItem>
              ))}
            </TextField>
            <WorkMarkerCheckbox
              checked={value.isWorkStart}
              label={he.workStartTask}
              hint={he.workStartTaskHint}
              disabled={disabled}
              onChange={(checked) => onChange({ isWorkStart: checked, ...(checked ? { isWorkEnd: false } : {}) })}
            />
            <WorkMarkerCheckbox
              checked={value.isWorkEnd}
              label={he.workEndTask}
              hint={he.workEndTaskHint}
              disabled={disabled}
              onChange={(checked) => onChange({ isWorkEnd: checked, ...(checked ? { isWorkStart: false } : {}) })}
            />
          </>
        ) : null}
      </Box>
    </CollapsibleSection>
  );
}
