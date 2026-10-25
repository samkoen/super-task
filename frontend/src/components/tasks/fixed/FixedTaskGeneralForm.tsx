import { Box, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import type { User } from "../../../services/api";
import type { FixedTaskGroup } from "../../../services/fixedTaskService";
import { he } from "../../../i18n/he";
import { EMPLOYEE_BRAND, employeeFieldSx } from "../../../styles/employeeUi";
import { assigneeOptionLabel } from "../../../utils/assigneeOptions";
import { formatTemplateSchedule } from "../../../utils/fixedTaskTemplates";
import type { FixedGeneralForm } from "../../../utils/fixedTaskGroups";
import CompletionRequirementsEditor from "../CompletionRequirementsEditor";
import CustomerLinkRow from "../CustomerLinkRow";
import DeliveryNoteTemplateFields from "../form/DeliveryNoteTemplateFields";
import TaskAdvancedFields from "../form/TaskAdvancedFields";
import TaskFormSection from "../form/TaskFormSection";
import TaskReferenceMediaEditor, { type TaskReferenceMediaValue } from "../TaskReferenceMediaEditor";
import WeekdayMultiSelect from "../WeekdayMultiSelect";

export interface FixedTaskGeneralFormProps {
  group: FixedTaskGroup;
  form: FixedGeneralForm;
  onFormChange: (form: FixedGeneralForm) => void;
  media: TaskReferenceMediaValue;
  onMediaChange: (media: TaskReferenceMediaValue) => void;
  /** Oved du snif : uniquement pour une tâche d'un seul snif (sinon l'assigné se règle par snif). */
  employees: User[];
  currentUserId?: string;
  saving: boolean;
  onTranscript: (transcript: string) => void;
  onError: (message: string) => void;
  onLinkCustomer?: (customerName: string) => Promise<boolean>;
}

type SectionProps = FixedTaskGeneralFormProps;

function WhatSection({ form, onFormChange, media, onMediaChange, saving, onTranscript, onError }: SectionProps) {
  return (
    <TaskFormSection title={he.taskFormSectionWhat}>
      <TextField
        label={he.taskTitle}
        value={form.title}
        onChange={(e) => onFormChange({ ...form, title: e.target.value })}
        fullWidth
        sx={employeeFieldSx}
      />
      <TextField
        label={he.description}
        value={form.description}
        onChange={(e) => onFormChange({ ...form, description: e.target.value })}
        multiline
        minRows={2}
        fullWidth
        sx={employeeFieldSx}
      />
      <TaskReferenceMediaEditor
        value={media}
        onChange={onMediaChange}
        onDescriptionAppend={onTranscript}
        disabled={saving}
        onError={onError}
      />
    </TaskFormSection>
  );
}

function WhenSection({ group, form, onFormChange, employees, currentUserId }: SectionProps) {
  const weekdays = group.recurrence === "daily" || group.recurrence === "weekly";
  return (
    <TaskFormSection title={group.is_network ? he.taskFormSectionWhen : he.taskFormSectionWho}>
      {!group.is_network ? (
        <TextField
          select
          required
          label={he.assignee}
          value={form.assignee_user_id}
          onChange={(e) => onFormChange({ ...form, assignee_user_id: e.target.value })}
          fullWidth
          sx={employeeFieldSx}
        >
          {employees.map((u) => (
            <MenuItem key={u.id} value={u.id}>{assigneeOptionLabel(u, currentUserId)}</MenuItem>
          ))}
        </TextField>
      ) : null}
      <TextField
        label={he.dueTime}
        type="time"
        value={form.due_time}
        onChange={(e) => onFormChange({ ...form, due_time: e.target.value })}
        InputLabelProps={{ shrink: true }}
        fullWidth
        dir="ltr"
        sx={employeeFieldSx}
      />
      {weekdays ? (
        <WeekdayMultiSelect
          value={form.weekly_days}
          onChange={(weekly_days) => onFormChange({ ...form, weekly_days })}
          exclusive={group.recurrence === "weekly"}
        />
      ) : null}
      <Typography fontWeight={800} sx={{ color: EMPLOYEE_BRAND }} data-testid="schedule-summary">
        {he.taskScheduleSummary(
          formatTemplateSchedule({ ...group, due_time: form.due_time, weekly_days: form.weekly_days }),
        )}
      </Typography>
    </TaskFormSection>
  );
}

function DeliverySection({ group, form, onFormChange, saving, onLinkCustomer }: SectionProps) {
  return (
    <TaskFormSection title={he.deliveryNoteSectionTitle}>
      <DeliveryNoteTemplateFields
        enabled={form.opened_by_delivery_note}
        onEnabledChange={(opened_by_delivery_note) => onFormChange({ ...form, opened_by_delivery_note })}
        taskType={form.delivery_note_task_type}
        onTaskTypeChange={(delivery_note_task_type) => onFormChange({ ...form, delivery_note_task_type })}
        disabled={saving}
      >
        {onLinkCustomer && !group.is_network ? <CustomerLinkRow onLink={onLinkCustomer} /> : null}
      </DeliveryNoteTemplateFields>
    </TaskFormSection>
  );
}

function AdvancedSection({ form, onFormChange, saving }: SectionProps) {
  return (
    <TaskAdvancedFields
      taskKind="fixed"
      value={{
        startUrl: form.start_url,
        opsCategory: form.ops_category,
        isWorkStart: form.is_work_start,
        isWorkEnd: form.is_work_end,
      }}
      onChange={(patch) =>
        onFormChange({
          ...form,
          ...(patch.startUrl !== undefined ? { start_url: patch.startUrl } : {}),
          ...(patch.opsCategory !== undefined ? { ops_category: patch.opsCategory } : {}),
          ...(patch.isWorkStart !== undefined ? { is_work_start: patch.isWorkStart } : {}),
          ...(patch.isWorkEnd !== undefined ? { is_work_end: patch.isWorkEnd } : {}),
        })
      }
      disabled={saving}
    />
  );
}

/** Réglages généraux d'une tâche fixe : ce qui est commun à tous les snifim (ou l'unique snif). */
export default function FixedTaskGeneralForm(props: FixedTaskGeneralFormProps) {
  const { form, onFormChange, saving } = props;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <WhatSection {...props} />
      <WhenSection {...props} />
      <DeliverySection {...props} />
      <TaskFormSection title={he.taskFormSectionProof}>
        <CompletionRequirementsEditor
          value={form.completion_requirements}
          onChange={(completion_requirements) => onFormChange({ ...form, completion_requirements })}
          disabled={saving}
        />
      </TaskFormSection>
      <AdvancedSection {...props} />
      <TaskFormSection title={he.status}>
        <FormControlLabel
          control={
            <Switch
              checked={form.is_active}
              onChange={(e) => onFormChange({ ...form, is_active: e.target.checked })}
            />
          }
          label={form.is_active ? he.active : he.inactive}
          sx={{ fontWeight: 700, minHeight: 48 }}
        />
      </TaskFormSection>
    </Box>
  );
}
