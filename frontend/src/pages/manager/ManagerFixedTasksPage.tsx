import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import { ApiError } from "../../services/api";
import type { User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import {
  taskService,
  type OpsCategory,
  type TaskTemplate,
} from "../../services/taskService";
import { userService } from "../../services/userService";
import NewTaskFormDialog, {
  type NewTaskFormSubmitPayload,
} from "../../components/tasks/NewTaskFormDialog";
import TaskReferenceMediaEditor, {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../../components/tasks/TaskReferenceMediaEditor";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { datetimeLocalForNewTask, todayIso } from "../../utils/dateView";
import {
  filterFixedTemplates,
  formatTemplateSchedule,
  opsCategoryLabel,
  sortFixedTemplates,
  type FixedTemplateFilter,
} from "../../utils/fixedTaskTemplates";
import { he } from "../../i18n/he";

const WEEKDAYS = [
  { value: "0", label: he.weekdayMon },
  { value: "1", label: he.weekdayTue },
  { value: "2", label: he.weekdayWed },
  { value: "3", label: he.weekdayThu },
  { value: "4", label: he.weekdayFri },
  { value: "5", label: he.weekdaySat },
  { value: "6", label: he.weekdaySun },
];

type EditForm = {
  title: string;
  description: string;
  due_time: string;
  weekly_days: string;
  assignee_user_id: string;
  is_active: boolean;
  ops_category: OpsCategory | "";
};

export default function ManagerFixedTasksPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FixedTemplateFilter>("all");
  const [filterBranch, setFilterBranch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editMedia, setEditMedia] = useState<TaskReferenceMediaValue>({
    reference_photo_url: "",
    reference_video_url: "",
    reference_audio_url: "",
  });
  const [saving, setSaving] = useState(false);

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
      setTemplates(tpl);
      setEmployees(emps);
      setBranches(branchList);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [scopeBranchId, canPickBranch, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () => sortFixedTemplates(filterFixedTemplates(templates, filter)),
    [templates, filter],
  );

  const openEdit = (tpl: TaskTemplate) => {
    setEditing(tpl);
    setEditForm({
      title: tpl.title,
      description: tpl.description ?? "",
      due_time: tpl.due_time || "09:00",
      weekly_days: tpl.weekly_days ?? "0",
      assignee_user_id: tpl.assignee_user_id ?? "",
      is_active: tpl.is_active,
      ops_category: tpl.ops_category ?? "",
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
      await taskService.createTemplate({
        branch_id: payload.branch_id,
        title: payload.title,
        description: payload.description,
        recurrence: payload.recurrence,
        due_time: payload.due_time,
        weekly_days: payload.weekly_days,
        monthly_day: payload.monthly_day,
        assignee_user_id: payload.assignee_user_id,
        ops_category: payload.ops_category,
        ...media,
      });
      setCreateOpen(false);
      showSuccess(he.managerFixedTasksCreated);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
      throw e;
    } finally {
      setCreateSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing || !editForm) return;
    if (!editForm.assignee_user_id.trim()) {
      showError(he.newTaskAssigneeRequired);
      return;
    }
    setSaving(true);
    try {
      const media = await resolveTaskReferenceMedia(editMedia);
      await taskService.updateTemplate(editing.id, {
        title: editForm.title,
        description: editForm.description,
        due_time: editForm.due_time,
        weekly_days:
          editing.recurrence === "weekly" || editing.recurrence === "biweekly"
            ? editForm.weekly_days
            : editing.weekly_days,
        assignee_user_id: editForm.assignee_user_id,
        department_id: editing.department_id,
        is_active: editForm.is_active,
        ops_category: editForm.ops_category || null,
        ...media,
      });
      setEditing(null);
      setEditForm(null);
      showSuccess(he.managerFixedTasksSaved);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
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
    if (!editing) return employees;
    return employees.filter((u) => u.branch_id === editing.branch_id);
  }, [employees, editing]);

  if (loading && templates.length === 0) {
    return <ListSkeleton variant="table" />;
  }

  return (
    <Box>
      <PageHeader
        title={he.managerFixedTasks}
        subtitle={he.managerFixedTasksSubtitle}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            {he.newFixedTask}
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={filter}
            onChange={(_, v: FixedTemplateFilter | null) => v && setFilter(v)}
          >
            <ToggleButton value="all">{he.managerFixedTasksFilterAll}</ToggleButton>
            <ToggleButton value="active">{he.managerFixedTasksFilterActive}</ToggleButton>
            <ToggleButton value="inactive">{he.managerFixedTasksFilterInactive}</ToggleButton>
          </ToggleButtonGroup>
          {canPickBranch && (
            <TextField
              select
              size="small"
              label={he.branch}
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">{he.all}</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </Paper>

      {rows.length === 0 ? (
        <EmptyState
          title={he.managerFixedTasksEmpty}
          description={he.managerFixedTasksEmptyHint}
          actionLabel={he.newFixedTask}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{he.taskTitle}</TableCell>
                <TableCell>{he.recurrence}</TableCell>
                <TableCell>{he.assignee}</TableCell>
                <TableCell>{he.opsCategory}</TableCell>
                <TableCell>{he.status}</TableCell>
                <TableCell align="left">{he.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((tpl) => (
                <TableRow key={tpl.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{tpl.title}</Typography>
                    {tpl.branch_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {tpl.branch_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <RepeatIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2">{formatTemplateSchedule(tpl)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{tpl.assignee_name || "—"}</TableCell>
                  <TableCell>{opsCategoryLabel(tpl.ops_category)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={tpl.is_active ? "success" : "default"}
                      label={tpl.is_active ? he.active : he.inactive}
                    />
                  </TableCell>
                  <TableCell align="left">
                    <Tooltip title={he.edit}>
                      <IconButton size="small" onClick={() => openEdit(tpl)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={he.managerFixedTasksToggleActive}>
                      <Switch
                        size="small"
                        checked={tpl.is_active}
                        onChange={() => void handleToggleActive(tpl)}
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <NewTaskFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        branches={branches}
        employees={employees}
        isBranchManager={isBranchManager}
        canPickBranch={canPickBranch}
        defaultBranchId={user?.branch_id ?? branches[0]?.id ?? ""}
        defaultDueAt={datetimeLocalForNewTask(todayIso())}
        forcedTaskKind="fixed"
        saving={createSaving}
        onError={showError}
      />

      <Dialog
        open={Boolean(editing && editForm)}
        onClose={() => !saving && setEditing(null)}
        fullWidth
        maxWidth="sm"
        dir="rtl"
      >
        <DialogTitle>{he.managerFixedTasksEdit}</DialogTitle>
        {editForm && editing && (
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {formatTemplateSchedule(editing)}
            </Typography>
            <TextField
              label={he.taskTitle}
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              fullWidth
            />
            <TextField
              label={he.description}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label={he.dueTime}
              type="time"
              value={editForm.due_time}
              onChange={(e) => setEditForm({ ...editForm, due_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              dir="ltr"
            />
            {(editing.recurrence === "weekly" || editing.recurrence === "biweekly") && (
              <TextField
                select
                label={he.weekday}
                value={editForm.weekly_days}
                onChange={(e) => setEditForm({ ...editForm, weekly_days: e.target.value })}
                fullWidth
              >
                {WEEKDAYS.map((d) => (
                  <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label={he.assignee}
              value={editForm.assignee_user_id}
              onChange={(e) => setEditForm({ ...editForm, assignee_user_id: e.target.value })}
              fullWidth
              required
            >
              {editEmployees.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={he.opsCategory}
              value={editForm.ops_category}
              onChange={(e) =>
                setEditForm({ ...editForm, ops_category: e.target.value as OpsCategory | "" })
              }
              fullWidth
            >
              <MenuItem value="">{he.opsCategoryNone}</MenuItem>
              <MenuItem value="cleaning">{he.opsCategoryLabels.cleaning}</MenuItem>
              <MenuItem value="fronts_signage">{he.opsCategoryLabels.fronts_signage}</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                />
              }
              label={editForm.is_active ? he.active : he.inactive}
            />
            <TaskReferenceMediaEditor
              value={editMedia}
              onChange={setEditMedia}
              disabled={saving}
              onError={showError}
            />
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditing(null)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={() => void handleSaveEdit()} disabled={saving}>
            {he.submit}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
