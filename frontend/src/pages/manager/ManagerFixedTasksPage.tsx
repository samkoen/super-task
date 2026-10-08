import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError } from "../../services/api";
import type { User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import { taskService, type TaskTemplate } from "../../services/taskService";
import { userService } from "../../services/userService";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { DELIVERY_TASK_LINE_CHECK } from "../../utils/deliveryNote";
import {
  deliveryNoteNeedsUpdate,
  formDeliveryNoteState,
  savedDeliveryNoteState,
} from "../../utils/deliveryNoteTemplate";
import FixedTemplateCard from "../../components/tasks/FixedTemplateCard";
import FixedTemplateEditDialog, {
  type FixedTemplateEditForm,
} from "../../components/tasks/FixedTemplateEditDialog";
import NewTaskFormDialog, {
  type NewTaskFormSubmitPayload,
} from "../../components/tasks/NewTaskFormDialog";
import {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../../components/tasks/TaskReferenceMediaEditor";
import ConfirmDeleteDialog from "../../components/ui/ConfirmDeleteDialog";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { employeeFieldSx } from "../../styles/employeeUi";
import { datetimeLocalForNewTask, todayIso } from "../../utils/dateView";
import { asList, asText } from "../../utils/asList";
import {
  asTaskTemplates,
  filterFixedTemplates,
  sortFixedTemplates,
  defaultApplyEditToNetwork,
  isNetworkFixedTemplate,
  networkFixedChipLabel,
  networkFixedTemplateIds,
  type FixedTemplateFilter,
} from "../../utils/fixedTaskTemplates";
import { applyReferenceTranscript } from "../../utils/applyReferenceTranscript";
import { he } from "../../i18n/he";
import { effectiveRequirements } from "../../utils/completionMedia";
import { resolveTaskCompletionGuides } from "../../utils/resolveTaskCompletionGuides";
import { assigneesForBranch, withSelfAssignee } from "../../utils/assigneeOptions";
import { groupedCreateApiFields } from "../../utils/fixedTaskCreateScope";
import { startUrlFieldError } from "../../utils/startUrl";
import { initialWeeklyDays, weeklyDaysPayload } from "../../utils/taskRecurrence";
import {
  MANAGER_FIXED_TASKS_DRAFT_KEY,
  readFixedTaskCreateDraft,
  readFixedTaskEditDraft,
  setFixedTaskCreateOpen,
  writeFixedTaskEditDraft,
} from "../../utils/fixedTaskScreenDraft";

type EditForm = FixedTemplateEditForm;

export default function ManagerFixedTasksPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FixedTemplateFilter>("all");
  const [filterBranch, setFilterBranch] = useState("");
  const [createOpen, setCreateOpen] = useState(
    () => readFixedTaskCreateDraft(MANAGER_FIXED_TASKS_DRAFT_KEY)?.open ?? false,
  );
  const [createSaving, setCreateSaving] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(
    () => readFixedTaskEditDraft(MANAGER_FIXED_TASKS_DRAFT_KEY)?.template ?? null,
  );
  const [editForm, setEditForm] = useState<EditForm | null>(
    () => readFixedTaskEditDraft(MANAGER_FIXED_TASKS_DRAFT_KEY)?.form ?? null,
  );
  const [editMedia, setEditMedia] = useState<TaskReferenceMediaValue>(
    () =>
      readFixedTaskEditDraft(MANAGER_FIXED_TASKS_DRAFT_KEY)?.media ?? {
        reference_photo_url: "",
        reference_video_url: "",
        reference_audio_url: "",
      },
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<TaskTemplate | null>(null);
  const [deleteAllBranches, setDeleteAllBranches] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const isBranchManager = user?.role === "branch_manager";
  const scopeBranchId = canPickBranch ? filterBranch || undefined : user?.branch_id || undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tpl, emps, branchList] = await Promise.all([
        taskService.listTemplates(scopeBranchId),
        userService.listTeam("employee"),
        canPickBranch ? branchService.list() : Promise.resolve([] as Branch[]),
      ]);
      setTemplates(asTaskTemplates(tpl));
      setEmployees(withSelfAssignee(asList<User>(emps), user));
      setBranches(asList<Branch>(branchList));
      setLoadError("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : he.errorGeneric;
      setLoadError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [scopeBranchId, canPickBranch, showError, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setFixedTaskCreateOpen(MANAGER_FIXED_TASKS_DRAFT_KEY, createOpen);
  }, [createOpen]);

  useEffect(() => {
    writeFixedTaskEditDraft(
      MANAGER_FIXED_TASKS_DRAFT_KEY,
      editing && editForm ? { template: editing, form: editForm, media: editMedia } : null,
    );
  }, [editing, editForm, editMedia]);

  const rows = useMemo(
    () => sortFixedTemplates(filterFixedTemplates(templates, filter)),
    [templates, filter],
  );
  const networkIds = useMemo(() => networkFixedTemplateIds(templates), [templates]);

  const openEdit = (tpl: TaskTemplate) => {
    setEditing(tpl);
    setEditForm({
      title: tpl.title,
      description: tpl.description ?? "",
      due_time: tpl.due_time || "09:00",
      weekly_days: initialWeeklyDays(tpl.recurrence, tpl.weekly_days),
      assignee_user_id: tpl.assignee_user_id ?? "",
      is_active: tpl.is_active,
      ops_category: tpl.ops_category ?? "",
      completion_requirements: effectiveRequirements(tpl),
      is_work_start: Boolean(tpl.is_work_start),
      is_work_end: Boolean(tpl.is_work_end),
      start_url: tpl.start_url ?? "",
      opened_by_delivery_note: savedDeliveryNoteState(tpl).opened,
      delivery_note_task_type: savedDeliveryNoteState(tpl).taskType ?? DELIVERY_TASK_LINE_CHECK,
      apply_to_network: defaultApplyEditToNetwork(tpl, canPickBranch, networkIds),
    });
    setEditMedia({
      reference_photo_url: tpl.reference_photo_url ?? "",
      reference_video_url: tpl.reference_video_url ?? "",
      reference_audio_url: tpl.reference_audio_url ?? "",
    });
  };

  const handleCreate = async (payload: NewTaskFormSubmitPayload) => {
    setCreateSaving(true);
    try {
      const media = await resolveTaskReferenceMedia(payload.media);
      const completion_requirements = await resolveTaskCompletionGuides(
        payload.completion_requirements,
      );
      const res = await taskService.createTemplate({
        ...groupedCreateApiFields(payload),
        title: payload.title,
        description: payload.description,
        recurrence: payload.recurrence,
        due_time: payload.due_time,
        weekly_days: weeklyDaysPayload(payload.recurrence, payload.weekly_days),
        monthly_day: payload.monthly_day,
        ops_category: payload.ops_category,
        completion_requirements,
        is_work_start: payload.is_work_start,
        is_work_end: payload.is_work_end,
        start_url: payload.start_url,
        opened_by_delivery_note: payload.opened_by_delivery_note,
        delivery_note_task_type: payload.delivery_note_task_type,
        ...media,
      });
      setCreateOpen(false);
      const createdCount = res.templates?.length ?? (res.template ? 1 : 0);
      showSuccess(
        payload.apply_to_network
          ? he.managerFixedTasksCreatedNetwork(createdCount)
          : he.managerFixedTasksCreated,
      );
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
      throw e;
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEditTranscript = async (transcript: string) => {
    if (!editForm) return;
    try {
      const applied = await applyReferenceTranscript({
        transcript,
        currentTitle: editForm.title,
        currentDescription: editForm.description,
        currentAssigneeId: editForm.assignee_user_id,
        employees: employees.map((u) => ({ id: u.id, full_name: u.full_name })),
        lockAssignee: true,
      });
      setEditForm((f) =>
        f
          ? { ...f, title: applied.title, description: applied.description }
          : f,
      );
    } catch {
      /* keep current fields if title AI fails */
    }
  };

  const saveDeliveryNoteState = async (template: TaskTemplate, form: EditForm) => {
    const wanted = formDeliveryNoteState(form);
    if (!deliveryNoteNeedsUpdate(savedDeliveryNoteState(template), wanted)) return;
    await deliveryNoteService.markTemplate(template.id, wanted.opened, wanted.taskType);
  };

  const linkAgrolineCustomer = async (customerName: string) => {
    if (!editing || !customerName) return;
    try {
      const linked = await deliveryNoteService.linkCustomer(customerName, editing.branch_id);
      const opened = linked.opened_occurrence_ids?.length ?? 0;
      showSuccess(opened ? `${he.deliveryNoteCustomerLinked} (${opened})` : he.deliveryNoteCustomerLinked);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing || !editForm) return;
    if (!editForm.assignee_user_id.trim()) {
      showError(he.newTaskAssigneeRequired);
      return;
    }
    const urlErr = startUrlFieldError(editForm.start_url);
    if (urlErr) {
      showError(urlErr);
      return;
    }
    setSaving(true);
    try {
      const media = await resolveTaskReferenceMedia(editMedia);
      const completion_requirements = await resolveTaskCompletionGuides(
        editForm.completion_requirements,
      );
      const res = await taskService.updateTemplate(editing.id, {
        title: editForm.title,
        description: editForm.description,
        due_time: editForm.due_time,
        weekly_days: weeklyDaysPayload(editing.recurrence, editForm.weekly_days) ?? editing.weekly_days,
        assignee_user_id: editForm.assignee_user_id,
        department_id: editing.department_id,
        is_active: editForm.is_active,
        ops_category: editForm.ops_category || null,
        completion_requirements,
        is_work_start: editForm.is_work_start,
        is_work_end: editForm.is_work_end,
        start_url: editForm.start_url,
        apply_to_network: editForm.apply_to_network,
        ...media,
      });
      await saveDeliveryNoteState(editing, editForm);
      setEditing(null);
      setEditForm(null);
      showSuccess(he.managerFixedTasksSavedNetwork(res.updated_count ?? 1));
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (tpl: TaskTemplate) => {
    setDeleting(tpl);
    setDeleteAllBranches(defaultApplyEditToNetwork(tpl, canPickBranch, networkIds));
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleteSaving(true);
    try {
      const res = await taskService.deleteTemplate(deleting.id, deleteAllBranches);
      setDeleting(null);
      setEditing(null);
      setEditForm(null);
      showSuccess(he.managerFixedTasksDeletedNetwork(res.deleted_count ?? 1));
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleToggleActive = async (tpl: TaskTemplate) => {
    try {
      await taskService.updateTemplate(tpl.id, {
        title: tpl.title,
        description: tpl.description ?? "",
        due_time: tpl.due_time,
        weekly_days: tpl.weekly_days,
        assignee_user_id: tpl.assignee_user_id,
        department_id: tpl.department_id,
        is_active: !tpl.is_active,
        ops_category: tpl.ops_category ?? null,
        completion_requirements: effectiveRequirements(tpl),
        is_work_start: Boolean(tpl.is_work_start),
        is_work_end: Boolean(tpl.is_work_end),
        start_url: tpl.start_url ?? null,
        reference_photo_url: tpl.reference_photo_url,
        reference_video_url: tpl.reference_video_url,
        reference_audio_url: tpl.reference_audio_url,
      });
      showSuccess(he.managerFixedTasksSaved);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const editEmployees = useMemo(() => {
    const staff = asList<User>(employees);
    if (!editing) return staff;
    return assigneesForBranch(staff, editing.branch_id, user?.id);
  }, [employees, editing]);

  return (
    <Box>
      <PageHeader
        title={he.managerFixedTasks}
        subtitle={he.managerFixedTasksSubtitle}
        action={
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 800 }}
          >
            {he.newFixedTask}
          </Button>
        }
      />

      <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center" mb={2}>
        <ToggleButtonGroup
          exclusive
          value={filter}
          onChange={(_, v: FixedTemplateFilter | null) => v && setFilter(v)}
          sx={{ "& .MuiToggleButton-root": { minHeight: 48, px: 2, fontWeight: 700 } }}
        >
          <ToggleButton value="all">{he.managerFixedTasksFilterAll}</ToggleButton>
          <ToggleButton value="active">{he.managerFixedTasksFilterActive}</ToggleButton>
          <ToggleButton value="inactive">{he.managerFixedTasksFilterInactive}</ToggleButton>
        </ToggleButtonGroup>
        {canPickBranch && (
          <TextField
            select
            label={he.branch}
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            sx={{ minWidth: 180, ...employeeFieldSx }}
          >
            <MenuItem value="">{he.all}</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {loading && templates.length === 0 ? (
        <ListSkeleton variant="table" />
      ) : loadError ? (
        <Alert severity="error">{loadError}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          title={he.managerFixedTasksEmpty}
          description={he.managerFixedTasksEmptyHint}
          actionLabel={he.newFixedTask}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <Box display="grid" gap={1.5} gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}>
          {rows.map((tpl) => (
            <FixedTemplateCard
              key={tpl.id}
              template={tpl}
              networkChip={
                isNetworkFixedTemplate(tpl, networkIds)
                  ? networkFixedChipLabel(tpl, templates, branches.length)
                  : undefined
              }
              onEdit={() => openEdit(tpl)}
              onToggleActive={() => void handleToggleActive(tpl)}
            />
          ))}
        </Box>
      )}

      {createOpen && (
        <NewTaskFormDialog
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          branches={branches}
          employees={employees}
          isBranchManager={isBranchManager}
          canPickBranch={canPickBranch}
          defaultBranchId={user?.branch_id ?? branches[0]?.id ?? ""}
          defaultDueAt={datetimeLocalForNewTask(todayIso())}
          forcedTaskKind="fixed"
          rememberKey={MANAGER_FIXED_TASKS_DRAFT_KEY}
          saving={createSaving}
          onError={showError}
          currentUserId={user?.id}
        />
      )}

      <FixedTemplateEditDialog
        template={editing}
        form={editForm}
        onFormChange={setEditForm}
        media={editMedia}
        onMediaChange={setEditMedia}
        employees={editEmployees}
        currentUserId={user?.id}
        showNetworkScope={Boolean(canPickBranch && editing && isNetworkFixedTemplate(editing, networkIds))}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={() => void handleSaveEdit()}
        onDelete={() => editing && openDelete(editing)}
        onTranscript={(transcript) => void handleEditTranscript(transcript)}
        onError={showError}
        onLinkCustomer={linkAgrolineCustomer}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title={he.managerFixedTasksDelete}
        itemName={deleting ? asText(deleting.title) : undefined}
        message={he.managerFixedTasksDeleteConfirm}
        optionLabel={
          deleting && canPickBranch && isNetworkFixedTemplate(deleting, networkIds)
            ? he.managerFixedTasksDeleteAllBranches
            : undefined
        }
        optionChecked={deleteAllBranches}
        onOptionChange={setDeleteAllBranches}
        saving={deleteSaving}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </Box>
  );
}
