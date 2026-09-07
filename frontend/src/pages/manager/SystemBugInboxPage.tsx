import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import { ApiError } from "../../services/api";
import {
  deleteSystemBug,
  listSystemBugs,
  setSystemBugStatus,
  type SystemBugInboxItem,
} from "../../services/systemBugService";
import SystemBugInboxDetailDialog from "../../components/systemBug/SystemBugInboxDetailDialog";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { formatDueAt } from "../../utils/dateView";
import { mediaUrl } from "../../utils/mediaUrl";
import { canViewSystemBugInbox, isSystemBugOpen } from "../../utils/systemBugInbox";
import { he } from "../../i18n/he";

export default function SystemBugInboxPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const [items, setItems] = useState<SystemBugInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemBugInboxItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!canViewSystemBugInbox(user)) return;
    setLoading(true);
    try {
      setItems(await listSystemBugs());
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [showError, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSystemBug(deleteTarget.id);
      showSuccess(he.systemBugInboxDeleted);
      setSelectedId((id) => (id === deleteTarget.id ? null : id));
      setDeleteTarget(null);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetStatus = async (item: SystemBugInboxItem, status: "open" | "closed") => {
    try {
      await setSystemBugStatus(item.id, status);
      setItems(await listSystemBugs());
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  if (!canViewSystemBugInbox(user)) return <Navigate to="/" replace />;

  return (
    <Box>
      <PageHeader title={he.systemBugInbox} subtitle={he.systemBugInboxSubtitle} />
      {loading ? (
        <ListSkeleton variant="table" rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title={he.systemBugInboxEmpty}
          icon={<BugReportOutlinedIcon fontSize="inherit" />}
        />
      ) : (
        <InboxList
          items={items}
          onSelect={setSelectedId}
          onAskDelete={setDeleteTarget}
          onSetStatus={handleSetStatus}
        />
      )}
      <SystemBugInboxDetailDialog
        reportId={selectedId}
        onClose={() => setSelectedId(null)}
        onAskDelete={setDeleteTarget}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </Box>
  );
}

function InboxList({
  items,
  onSelect,
  onAskDelete,
  onSetStatus,
}: {
  items: SystemBugInboxItem[];
  onSelect: (id: string) => void;
  onAskDelete: (item: SystemBugInboxItem) => void;
  onSetStatus: (item: SystemBugInboxItem, status: "open" | "closed") => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {items.map((item) => (
        <InboxRow
          key={item.id}
          item={item}
          onSelect={onSelect}
          onAskDelete={onAskDelete}
          onSetStatus={onSetStatus}
        />
      ))}
    </Box>
  );
}

function InboxRow({
  item,
  onSelect,
  onAskDelete,
  onSetStatus,
}: {
  item: SystemBugInboxItem;
  onSelect: (id: string) => void;
  onAskDelete: (item: SystemBugInboxItem) => void;
  onSetStatus: (item: SystemBugInboxItem, status: "open" | "closed") => void;
}) {
  const shotSrc = mediaUrl(item.screenshot_url);
  const open = isSystemBugOpen(item.status);
  return (
    <Paper
      variant="outlined"
      onClick={() => onSelect(item.id)}
      sx={{
        p: 1.5,
        display: "flex",
        gap: 1.5,
        cursor: "pointer",
        borderRadius: 2,
        opacity: open ? 1 : 0.72,
      }}
    >
      <InboxThumb shotSrc={shotSrc} />
      <Box minWidth={0} flex={1}>
        <Box display="flex" alignItems="center" gap={1} mb={0.25}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {item.reporter_name || "—"}
            {item.branch_name ? ` · ${item.branch_name}` : ""}
          </Typography>
          <Chip
            size="small"
            label={open ? he.systemBugInboxOpen : he.systemBugInboxClosed}
            color={open ? "success" : "default"}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.note || he.issueReportMediaOnly}
        </Typography>
        <Typography variant="caption" color="text.secondary" dir="ltr">
          {formatDueAt(item.created_at)}
          {item.audio_url ? ` · ${he.systemBugInboxAudio}` : ""}
        </Typography>
      </Box>
      <InboxStatusActions item={item} open={open} onAskDelete={onAskDelete} onSetStatus={onSetStatus} />
    </Paper>
  );
}

function InboxStatusActions({
  item,
  open,
  onAskDelete,
  onSetStatus,
}: {
  item: SystemBugInboxItem;
  open: boolean;
  onAskDelete: (item: SystemBugInboxItem) => void;
  onSetStatus: (item: SystemBugInboxItem, status: "open" | "closed") => void;
}) {
  return (
    <Box display="flex" alignItems="center" onClick={(e) => e.stopPropagation()}>
      <Tooltip title={he.systemBugInboxClose}>
        <span>
          <IconButton
            size="small"
            color="success"
            disabled={!open}
            onClick={() => onSetStatus(item, "closed")}
          >
            <CheckCircleOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={he.systemBugInboxReopen}>
        <span>
          <IconButton
            size="small"
            color="primary"
            disabled={open}
            onClick={() => onSetStatus(item, "open")}
          >
            <ReplayOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={he.systemBugInboxDelete}>
        <IconButton size="small" color="error" onClick={() => onAskDelete(item)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function InboxThumb({ shotSrc }: { shotSrc: string | null }) {
  return (
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: 1.5,
        overflow: "hidden",
        bgcolor: "action.hover",
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
      }}
    >
      {shotSrc ? (
        <Box component="img" src={shotSrc} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <BugReportOutlinedIcon color="disabled" />
      )}
    </Box>
  );
}

function DeleteConfirmDialog({
  open,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={() => !deleting && onCancel()} dir="rtl">
      <DialogTitle>{he.systemBugInboxDelete}</DialogTitle>
      <DialogContent>
        <Typography>{he.systemBugInboxDeleteConfirm}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={onCancel} disabled={deleting}>
          {he.cancel}
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={deleting}>
          {he.systemBugInboxDelete}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
