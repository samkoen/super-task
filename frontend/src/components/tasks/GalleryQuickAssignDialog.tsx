import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import type { User } from "../../services/api";
import type { Branch } from "../../services/branchService";
import type { TaskGalleryItem } from "../../services/taskGalleryService";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";

export interface GalleryQuickAssignPayload {
  item: TaskGalleryItem;
  branch_id: string;
  assignee_user_id: string;
  due_at: string;
}

interface GalleryQuickAssignDialogProps {
  open: boolean;
  item: TaskGalleryItem | null;
  branches: Branch[];
  employees: User[];
  canPickBranch: boolean;
  defaultBranchId: string;
  defaultDueAt: string;
  defaultAssigneeId?: string;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: GalleryQuickAssignPayload) => Promise<void>;
}

export default function GalleryQuickAssignDialog({
  open,
  item,
  branches,
  employees,
  canPickBranch,
  defaultBranchId,
  defaultDueAt,
  defaultAssigneeId = "",
  saving = false,
  onClose,
  onSubmit,
}: GalleryQuickAssignDialogProps) {
  const [branchId, setBranchId] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setBranchId(defaultBranchId || item.branch_id || "");
    setAssigneeUserId(defaultAssigneeId);
    setDueAt(defaultDueAt);
    setLocalError("");
  }, [open, item, defaultBranchId, defaultDueAt, defaultAssigneeId]);

  const branchEmployees = useMemo(
    () => (branchId ? employees.filter((u) => u.branch_id === branchId) : employees),
    [employees, branchId],
  );

  const thumb = item ? mediaUrl(item.reference_photo_url) : null;
  const isAdHoc = item?.task_kind === "ad_hoc";

  const handleSubmit = async () => {
    if (!item) return;
    if (!assigneeUserId.trim()) {
      setLocalError(he.newTaskAssigneeRequired);
      return;
    }
    if (!branchId.trim()) {
      setLocalError(he.taskVoiceNeedBranch);
      return;
    }
    setLocalError("");
    await onSubmit({
      item,
      branch_id: branchId,
      assignee_user_id: assigneeUserId,
      due_at: dueAt,
    });
  };

  return (
    <Dialog open={open && Boolean(item)} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{he.taskGalleryAssignTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {he.taskGalleryAssignHint}
        </Typography>
        {item && (
          <Box display="flex" gap={1.5} alignItems="center">
            {thumb ? (
              <Box
                component="img"
                src={thumb}
                alt=""
                sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: 1.5 }}
              />
            ) : (
              <Box sx={{ width: 64, height: 64, borderRadius: 1.5, bgcolor: "action.hover" }} />
            )}
            <Box minWidth={0}>
              <Typography fontWeight={700} noWrap>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {he.taskKindLabels[item.task_kind]}
              </Typography>
            </Box>
          </Box>
        )}

        {canPickBranch && (
          <TextField
            select
            label={he.branch}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            required
            fullWidth
          >
            {branches.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
        )}

        {isAdHoc && (
          <TextField
            label={he.dueAt}
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            dir="ltr"
          />
        )}

        <TextField
          select
          label={he.assignee}
          value={assigneeUserId}
          onChange={(e) => setAssigneeUserId(e.target.value)}
          required
          fullWidth
          error={Boolean(localError && !assigneeUserId)}
        >
          {branchEmployees.map((u) => (
            <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
          ))}
        </TextField>

        {localError && (
          <Typography variant="caption" color="error">{localError}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>{he.cancel}</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={saving || !assigneeUserId || !branchId || (isAdHoc && !dueAt)}
        >
          {saving ? <CircularProgress size={22} /> : he.submit}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
