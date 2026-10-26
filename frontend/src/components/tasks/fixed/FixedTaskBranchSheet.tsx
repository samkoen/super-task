import { useState, type ReactNode } from "react";
import { Box, Button, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import type { User } from "../../../services/api";
import type { FixedTaskBranch, FixedTaskGroup } from "../../../services/fixedTaskService";
import { he } from "../../../i18n/he";
import { employeeFieldSx } from "../../../styles/employeeUi";
import { asText } from "../../../utils/asList";
import { assigneeOptionLabel } from "../../../utils/assigneeOptions";
import { effectiveRequirements } from "../../../utils/completionMedia";
import { requirementsSummary } from "../../../utils/completionRequirementList";
import { branchToForm, type FixedBranchForm } from "../../../utils/fixedTaskGroups";
import { formatWeekdaysPart } from "../../../utils/taskRecurrence";
import CompletionRequirementsEditor from "../CompletionRequirementsEditor";
import CustomerLinkRow from "../CustomerLinkRow";
import TaskFormSection from "../form/TaskFormSection";
import WeekdayMultiSelect from "../WeekdayMultiSelect";
import EditDialogFooterButtons from "../../ui/EditDialogFooterButtons";
import FormDialog from "../../ui/FormDialog";

/** Un champ adaptable : interrupteur « התאמה לסניף », valeur par défaut visible, saisie si adapté. */
function OverrideField({
  label,
  defaultText,
  custom,
  onCustomChange,
  children,
}: {
  label: string;
  defaultText: string;
  custom: boolean;
  onCustomChange: (custom: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Box sx={{ border: 1, borderColor: custom ? "warning.main" : "divider", borderRadius: "14px", p: 1.5 }}>
      <FormControlLabel
        control={
          <Switch
            checked={custom}
            onChange={(e) => onCustomChange(e.target.checked)}
            inputProps={{ "aria-label": `${he.fixedBranchCustomToggle}: ${label}` }}
          />
        }
        label={
          <Box>
            <Typography fontWeight={800}>{label}</Typography>
            <Typography variant="body2" color="text.secondary">
              {he.fixedBranchDefaultValue(defaultText)}
            </Typography>
          </Box>
        }
        sx={{ mx: 0, alignItems: "flex-start" }}
      />
      {custom ? <Box mt={1.5}>{children}</Box> : null}
    </Box>
  );
}

type FieldsProps = {
  group: FixedTaskGroup;
  form: FixedBranchForm;
  onChange: (form: FixedBranchForm) => void;
};

function ScheduleOverrides({ group, form, onChange }: FieldsProps) {
  const weekdays = group.recurrence === "daily" || group.recurrence === "weekly";
  return (
    <>
      <OverrideField
        label={he.dueTime}
        defaultText={group.due_time}
        custom={form.custom_due_time}
        onCustomChange={(custom_due_time) => onChange({ ...form, custom_due_time })}
      >
        <TextField
          type="time"
          label={he.dueTime}
          value={form.due_time}
          onChange={(e) => onChange({ ...form, due_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
          fullWidth
          dir="ltr"
          sx={employeeFieldSx}
        />
      </OverrideField>
      {weekdays ? (
        <OverrideField
          label={he.fixedBranchDaysLabel}
          defaultText={formatWeekdaysPart(group.weekly_days) || "—"}
          custom={form.custom_weekly_days}
          onCustomChange={(custom_weekly_days) => onChange({ ...form, custom_weekly_days })}
        >
          <WeekdayMultiSelect
            value={form.weekly_days}
            onChange={(weekly_days) => onChange({ ...form, weekly_days })}
            exclusive={group.recurrence === "weekly"}
          />
        </OverrideField>
      ) : null}
    </>
  );
}

function TextOverrides({ group, form, onChange }: FieldsProps) {
  return (
    <>
      <OverrideField
        label={he.fixedBranchDescriptionLabel}
        defaultText={asText(group.description) || "—"}
        custom={form.custom_description}
        onCustomChange={(custom_description) => onChange({ ...form, custom_description })}
      >
        <TextField
          label={he.description}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          multiline
          minRows={2}
          fullWidth
          sx={employeeFieldSx}
        />
      </OverrideField>
      <OverrideField
        label={he.startUrl}
        defaultText={asText(group.start_url) || "—"}
        custom={form.custom_start_url}
        onCustomChange={(custom_start_url) => onChange({ ...form, custom_start_url })}
      >
        <TextField
          label={he.startUrl}
          value={form.start_url}
          onChange={(e) => onChange({ ...form, start_url: e.target.value })}
          fullWidth
          dir="ltr"
          sx={employeeFieldSx}
        />
      </OverrideField>
    </>
  );
}

/** « מה העובד צריך לצרף » : par défaut la liste générale, ou une liste propre à ce snif. */
function ProofOverride({ group, form, onChange, disabled }: FieldsProps & { disabled: boolean }) {
  return (
    <OverrideField
      label={he.taskFormSectionProof}
      defaultText={requirementsSummary(effectiveRequirements(group))}
      custom={form.custom_completion}
      onCustomChange={(custom_completion) => onChange({ ...form, custom_completion })}
    >
      <CompletionRequirementsEditor
        value={form.completion_requirements}
        onChange={(completion_requirements) => onChange({ ...form, completion_requirements })}
        disabled={disabled}
      />
    </OverrideField>
  );
}

function resetAll(form: FixedBranchForm, group: FixedTaskGroup): FixedBranchForm {
  return {
    ...form,
    custom_completion: false,
    completion_requirements: effectiveRequirements(group),
    is_active: group.is_active,
    custom_due_time: false,
    due_time: group.due_time,
    custom_weekly_days: false,
    custom_description: false,
    custom_start_url: false,
  };
}

function SheetBody({
  group,
  form,
  onChange,
  employees,
  currentUserId,
  onLinkCustomer,
  onRemove,
  saving,
}: FieldsProps & {
  employees: User[];
  currentUserId?: string;
  onLinkCustomer?: (customerName: string) => Promise<boolean>;
  onRemove?: () => void;
  saving: boolean;
}) {
  return (
    <>
      <TaskFormSection title={he.assignee}>
        <TextField
          select
          required
          label={he.assignee}
          value={form.assignee_user_id}
          onChange={(e) => onChange({ ...form, assignee_user_id: e.target.value })}
          fullWidth
          sx={employeeFieldSx}
        >
          {employees.map((u) => (
            <MenuItem key={u.id} value={u.id}>{assigneeOptionLabel(u, currentUserId)}</MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={form.is_active} onChange={(e) => onChange({ ...form, is_active: e.target.checked })} />}
          label={he.fixedBranchActiveLabel}
          sx={{ fontWeight: 700, minHeight: 48 }}
        />
      </TaskFormSection>
      <TaskFormSection title={he.fixedBranchCustomToggle}>
        <ScheduleOverrides group={group} form={form} onChange={onChange} />
        <TextOverrides group={group} form={form} onChange={onChange} />
        <ProofOverride group={group} form={form} onChange={onChange} disabled={saving} />
        <Button
          startIcon={<RestartAltIcon />}
          onClick={() => onChange(resetAll(form, group))}
          disabled={saving}
          sx={{ minHeight: 48, fontWeight: 700 }}
        >
          {he.fixedBranchResetAll}
        </Button>
      </TaskFormSection>
      {onLinkCustomer && group.opened_by_delivery_note ? (
        <TaskFormSection title={he.deliveryNoteSectionTitle}>
          <CustomerLinkRow onLink={onLinkCustomer} />
        </TaskFormSection>
      ) : null}
      {onRemove ? (
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={onRemove}
          disabled={saving}
          sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 700 }}
        >
          {he.fixedDetailRemoveFromBranch}
        </Button>
      ) : null}
    </>
  );
}

export interface FixedTaskBranchSheetProps {
  group: FixedTaskGroup;
  branch: FixedTaskBranch;
  employees: User[];
  currentUserId?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (form: FixedBranchForm) => void;
  onLinkCustomer?: (customerName: string) => Promise<boolean>;
  onRemove?: () => void;
}

/** Fenêtre « התאמה לסניף X » (plein écran sur téléphone). Le formulaire repart de zéro pour chaque snif. */
export default function FixedTaskBranchSheet(props: FixedTaskBranchSheetProps) {
  const { group, branch, saving, onClose, onSave } = props;
  const [form, setForm] = useState<FixedBranchForm>(() => branchToForm(branch, group));
  return (
    <FormDialog
      open
      title={he.fixedBranchSheetTitle(asText(branch.branch_name))}
      onClose={onClose}
      busy={saving}
      actions={
        <EditDialogFooterButtons
          onCancel={onClose}
          onSubmit={() => onSave(form)}
          disabled={saving}
          submitDisabled={!form.assignee_user_id}
          submitting={saving}
          submitLabel={he.fixedBranchSave}
        />
      }
    >
      <SheetBody {...props} form={form} onChange={setForm} />
    </FormDialog>
  );
}
