import { useState } from "react";
import { Box, Button, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { User } from "../../services/api";
import type { OpsCategory, TaskTemplate } from "../../services/taskService";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, employeeFieldSx } from "../../styles/employeeUi";
import { assigneeOptionLabel } from "../../utils/assigneeOptions";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { formatTemplateSchedule } from "../../utils/fixedTaskTemplates";
import EditDialogSaveActions from "../ui/EditDialogSaveActions";
import FormDialog from "../ui/FormDialog";
import CompletionRequirementsEditor from "./CompletionRequirementsEditor";
import DeliveryNoteTemplateFields from "./form/DeliveryNoteTemplateFields";
import TaskAdvancedFields from "./form/TaskAdvancedFields";
import TaskFormSection from "./form/TaskFormSection";
import TaskReferenceMediaEditor, { type TaskReferenceMediaValue } from "./TaskReferenceMediaEditor";
import WeekdayMultiSelect from "./WeekdayMultiSelect";

export type FixedTemplateEditForm = {
  title: string;
  description: string;
  due_time: string;
  weekly_days: string;
  assignee_user_id: string;
  is_active: boolean;
  ops_category: OpsCategory | "";
  completion_requirements: CompletionRequirement[];
  is_work_start: boolean;
  is_work_end: boolean;
  start_url: string;
  apply_to_network: boolean;
  opened_by_delivery_note?: boolean;
  delivery_note_task_type?: string;
};

export interface FixedTemplateEditDialogProps {
  template: TaskTemplate | null;
  form: FixedTemplateEditForm | null;
  onFormChange: (form: FixedTemplateEditForm) => void;
  media: TaskReferenceMediaValue;
  onMediaChange: (media: TaskReferenceMediaValue) => void;
  employees: User[];
  currentUserId?: string;
  /** Tâche présente dans tous les snifim et utilisateur réseau : propose la mise à jour groupée. */
  showNetworkScope: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onTranscript: (transcript: string) => void;
  onError: (message: string) => void;
  /** Rattache un client Agroline au snif de la tâche (action immédiate, hors bouton d'enregistrement). */
  onLinkCustomer?: (customerName: string) => Promise<boolean>;
}

function CustomerLinkRow({ onLink }: { onLink: (customerName: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const link = async () => {
    setBusy(true);
    try {
      if (await onLink(name.trim())) setName("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TextField
        label={he.deliveryNoteCustomer}
        value={name}
        onChange={(e) => setName(e.target.value)}
        helperText={he.deliveryNoteCustomerHint}
        fullWidth
        sx={employeeFieldSx}
      />
      <Button
        variant="outlined"
        onClick={() => void link()}
        disabled={busy || !name.trim()}
        sx={{ minHeight: 48, borderRadius: "14px", fontWeight: 700 }}
      >
        {he.deliveryNoteLinkCustomer}
      </Button>
    </Box>
  );
}

function ScheduleFields({
  template,
  form,
  onFormChange,
}: Pick<FixedTemplateEditDialogProps, "onFormChange"> & {
  template: TaskTemplate;
  form: FixedTemplateEditForm;
}) {
  return (
    <>
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
      {template.recurrence === "daily" || template.recurrence === "weekly" ? (
        <WeekdayMultiSelect
          value={form.weekly_days}
          onChange={(weekly_days) => onFormChange({ ...form, weekly_days })}
          exclusive={template.recurrence === "weekly"}
        />
      ) : null}
      <Typography fontWeight={800} sx={{ color: EMPLOYEE_BRAND }} data-testid="schedule-summary">
        {he.taskScheduleSummary(
          formatTemplateSchedule({
            ...template,
            due_time: form.due_time,
            weekly_days: form.weekly_days,
          }),
        )}
      </Typography>
    </>
  );
}

function StatusFields({
  form,
  onFormChange,
  showNetworkScope,
}: Pick<FixedTemplateEditDialogProps, "onFormChange" | "showNetworkScope"> & {
  form: FixedTemplateEditForm;
}) {
  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={form.is_active}
            onChange={(e) => onFormChange({ ...form, is_active: e.target.checked })}
          />
        }
        label={form.is_active ? he.active : he.inactive}
        sx={{ fontWeight: 700 }}
      />
      {showNetworkScope ? (
        <>
          <FormControlLabel
            control={
              <Switch
                checked={form.apply_to_network}
                onChange={(e) => onFormChange({ ...form, apply_to_network: e.target.checked })}
              />
            }
            label={he.fixedTaskUpdateAllBranches}
          />
          {form.apply_to_network ? (
            <Typography color="text.secondary">{he.fixedTaskUpdateAllBranchesHint}</Typography>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function EditFormBody(props: FixedTemplateEditDialogProps & { template: TaskTemplate; form: FixedTemplateEditForm }) {
  const { template, form, onFormChange, media, onMediaChange, employees, currentUserId, saving } = props;
  return (
    <>
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
          onDescriptionAppend={props.onTranscript}
          disabled={saving}
          onError={props.onError}
        />
      </TaskFormSection>
      <TaskFormSection title={he.taskFormSectionWho}>
        <TextField
          select
          label={he.assignee}
          value={form.assignee_user_id}
          onChange={(e) => onFormChange({ ...form, assignee_user_id: e.target.value })}
          fullWidth
          required
          sx={employeeFieldSx}
        >
          {employees.map((u) => (
            <MenuItem key={u.id} value={u.id}>{assigneeOptionLabel(u, currentUserId)}</MenuItem>
          ))}
        </TextField>
        <ScheduleFields template={template} form={form} onFormChange={onFormChange} />
      </TaskFormSection>
      <TaskFormSection title={he.deliveryNoteSectionTitle}>
        <DeliveryNoteTemplateFields
          enabled={Boolean(form.opened_by_delivery_note)}
          onEnabledChange={(enabled) => onFormChange({ ...form, opened_by_delivery_note: enabled })}
          taskType={form.delivery_note_task_type}
          onTaskTypeChange={(delivery_note_task_type) => onFormChange({ ...form, delivery_note_task_type })}
          disabled={saving}
        >
          {props.onLinkCustomer ? <CustomerLinkRow onLink={props.onLinkCustomer} /> : null}
        </DeliveryNoteTemplateFields>
      </TaskFormSection>
      <TaskFormSection title={he.taskFormSectionProof}>
        <CompletionRequirementsEditor
          value={form.completion_requirements}
          onChange={(completion_requirements) => onFormChange({ ...form, completion_requirements })}
          disabled={saving}
        />
      </TaskFormSection>
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
      <TaskFormSection title={he.status}>
        <StatusFields form={form} onFormChange={onFormChange} showNetworkScope={props.showNetworkScope} />
      </TaskFormSection>
      <Button
        color="error"
        variant="outlined"
        startIcon={<DeleteOutlineIcon />}
        onClick={props.onDelete}
        disabled={saving}
        sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 700 }}
      >
        {he.managerFixedTasksDelete}
      </Button>
    </>
  );
}

/** Fenêtre d'édition d'une tâche fixe (récurrence non modifiable : on ajuste heure, jours, consignes). */
export default function FixedTemplateEditDialog(props: FixedTemplateEditDialogProps) {
  const { template, form, saving } = props;
  return (
    <FormDialog
      open={Boolean(template && form)}
      title={he.managerFixedTasksEdit}
      onClose={props.onClose}
      busy={saving}
      actions={
        <EditDialogSaveActions
          applyToNetwork={Boolean(form?.apply_to_network)}
          resetKey={template?.id}
          onCancel={props.onClose}
          onSave={props.onSave}
          disabled={saving}
          submitDisabled={!form}
          submitting={saving}
        />
      }
    >
      {template && form ? <EditFormBody {...props} template={template} form={form} /> : null}
    </FormDialog>
  );
}
