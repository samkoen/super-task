import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { ApiError } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import {
  taskGalleryService,
  type GalleryTaskKind,
  type TaskGalleryItem,
  type TaskGalleryPayload,
} from "../../services/taskGalleryService";
import {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../../components/tasks/TaskReferenceMediaEditor";
import TaskReferenceMediaEditor from "../../components/tasks/TaskReferenceMediaEditor";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { ensureTaskTitle } from "../../utils/ensureTaskTitle";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";

const EMPTY_MEDIA: TaskReferenceMediaValue = {
  reference_photo_url: "",
  reference_video_url: "",
  reference_audio_url: "",
};

type FormState = {
  title: string;
  description: string;
  task_kind: GalleryTaskKind;
  branch_id: string;
  recurrence: string;
  due_time: string;
  weekly_days: string;
  monthly_day: number;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  task_kind: "ad_hoc",
  branch_id: "",
  recurrence: "daily",
  due_time: "09:00",
  weekly_days: "0",
  monthly_day: 1,
};

export default function ManagerTaskGalleryPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const [items, setItems] = useState<TaskGalleryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<TaskGalleryItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [media, setMedia] = useState<TaskReferenceMediaValue>(EMPTY_MEDIA);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskGalleryItem | null>(null);

  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gallery, branchList] = await Promise.all([
        taskGalleryService.list(),
        canPickBranch ? branchService.list() : Promise.resolve([] as Branch[]),
      ]);
      setItems(gallery);
      setBranches(branchList);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [canPickBranch, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      branch_id: user?.branch_id ?? "",
    });
    setMedia(EMPTY_MEDIA);
    setOpenForm(true);
  };

  const openEdit = (item: TaskGalleryItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      task_kind: item.task_kind,
      branch_id: item.branch_id ?? "",
      recurrence: item.recurrence || "daily",
      due_time: item.due_time || "09:00",
      weekly_days: item.weekly_days || "0",
      monthly_day: item.monthly_day ?? 1,
    });
    setMedia({
      reference_photo_url: item.reference_photo_url ?? "",
      reference_video_url: item.reference_video_url ?? "",
      reference_audio_url: item.reference_audio_url ?? "",
    });
    setOpenForm(true);
  };

  const buildPayload = async (): Promise<TaskGalleryPayload> => {
    const resolved = await resolveTaskReferenceMedia(media);
    const payload: TaskGalleryPayload = {
      title: form.title.trim(),
      description: form.description,
      task_kind: form.task_kind,
      branch_id: canPickBranch ? form.branch_id || null : user?.branch_id || null,
      photo_required: true,
      ...resolved,
    };
    if (form.task_kind === "fixed") {
      payload.recurrence = form.recurrence;
      payload.due_time = form.due_time;
      payload.weekly_days =
        form.recurrence === "weekly" || form.recurrence === "biweekly"
          ? form.weekly_days
          : null;
      payload.monthly_day = form.recurrence === "monthly" ? form.monthly_day : null;
    }
    if (user?.role === "admin" && user.network_id) {
      payload.network_id = user.network_id;
    }
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const title = await ensureTaskTitle(form.title, form.description);
      setForm((f) => ({ ...f, title }));
      const payload = await buildPayload();
      payload.title = title;
      const res = editing
        ? await taskGalleryService.update(editing.id, payload)
        : await taskGalleryService.create(payload);
      showSuccess(res.message);
      setOpenForm(false);
      await load();
    } catch (e) {
      if (e instanceof Error && e.message === "TITLE_OR_DESCRIPTION_REQUIRED") {
        showError(he.taskTitleOrDescriptionRequired);
      } else {
        showError(e instanceof ApiError ? e.message : he.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await taskGalleryService.delete(deleteTarget.id);
      showSuccess(res.message);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? map.get(id) || id : he.taskGalleryNetworkWide);
  }, [branches]);

  return (
    <Box>
      <PageHeader
        title={he.taskGallery}
        subtitle={he.taskGallerySubtitle}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            {he.taskGalleryNew}
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton variant="table" rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title={he.taskGalleryEmpty}
          description={he.taskGalleryEmptyHint}
          icon={<CollectionsBookmarkIcon fontSize="inherit" />}
        />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={72}>{he.issueReportPhoto}</TableCell>
                <TableCell>{he.taskTitle}</TableCell>
                <TableCell>{he.taskKind}</TableCell>
                {canPickBranch && <TableCell>{he.branch}</TableCell>}
                <TableCell width={100} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const photoSrc = mediaUrl(item.reference_photo_url);
                const videoSrc = mediaUrl(item.reference_video_url);
                return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    {photoSrc ? (
                      <Box
                        component="img"
                        src={photoSrc}
                        alt=""
                        sx={{
                          width: 48,
                          height: 48,
                          objectFit: "cover",
                          borderRadius: 1.5,
                          display: "block",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    ) : videoSrc ? (
                      <Box
                        component="video"
                        src={videoSrc}
                        muted
                        sx={{
                          width: 48,
                          height: 48,
                          objectFit: "cover",
                          borderRadius: 1.5,
                          display: "block",
                          bgcolor: "action.hover",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          bgcolor: "action.hover",
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{item.title}</Typography>
                    {item.description && (
                      <Typography variant="body2" color="text.secondary" noWrap maxWidth={360}>
                        {item.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{he.taskKindLabels[item.task_kind]}</TableCell>
                  {canPickBranch && <TableCell>{branchName(item.branch_id)}</TableCell>}
                  <TableCell align="left">
                    <Tooltip title={he.edit}>
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={he.taskGalleryDelete}>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{editing ? he.taskGalleryEdit : he.taskGalleryNew}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={he.taskTitle}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            helperText={he.taskTitleOptionalHint}
            fullWidth
          />
          <TextField
            label={he.description}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            multiline
            minRows={2}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>{he.taskKind}</InputLabel>
            <Select
              label={he.taskKind}
              value={form.task_kind}
              onChange={(e) =>
                setForm((f) => ({ ...f, task_kind: e.target.value as GalleryTaskKind }))
              }
            >
              <MenuItem value="ad_hoc">{he.taskKindLabels.ad_hoc}</MenuItem>
              <MenuItem value="fixed">{he.taskKindLabels.fixed}</MenuItem>
            </Select>
          </FormControl>
          {canPickBranch && (
            <FormControl fullWidth>
              <InputLabel>{he.branch}</InputLabel>
              <Select
                label={he.branch}
                value={form.branch_id}
                onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
              >
                <MenuItem value="">{he.taskGalleryNetworkWide}</MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {form.task_kind === "fixed" && (
            <>
              <FormControl fullWidth>
                <InputLabel>{he.recurrence}</InputLabel>
                <Select
                  label={he.recurrence}
                  value={form.recurrence}
                  onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                >
                  {Object.entries(he.recurrenceLabels)
                    .filter(([k]) => k !== "once")
                    .map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                label={he.dueTime}
                type="time"
                value={form.due_time}
                onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </>
          )}
          <TaskReferenceMediaEditor
            value={media}
            onChange={setMedia}
            onDescriptionAppend={(text) =>
              setForm((f) => ({
                ...f,
                description: f.description ? `${f.description}\n${text}` : text,
              }))
            }
            onError={showError}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)}>{he.cancel}</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving || (!form.title.trim() && !form.description.trim())}
          >
            {he.submit}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} dir="rtl">
        <DialogTitle>{he.taskGalleryDeleteConfirm}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{he.cancel}</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()} disabled={saving}>
            {he.taskGalleryDelete}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
