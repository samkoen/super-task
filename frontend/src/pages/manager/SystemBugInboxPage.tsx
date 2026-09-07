import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Box, Paper, Typography } from "@mui/material";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import { ApiError } from "../../services/api";
import { listSystemBugs, type SystemBugInboxItem } from "../../services/systemBugService";
import SystemBugInboxDetailDialog from "../../components/systemBug/SystemBugInboxDetailDialog";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { formatDueAt } from "../../utils/dateView";
import { mediaUrl } from "../../utils/mediaUrl";
import { canViewSystemBugInbox } from "../../utils/systemBugInbox";
import { he } from "../../i18n/he";

export default function SystemBugInboxPage() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const [items, setItems] = useState<SystemBugInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        <InboxList items={items} onSelect={setSelectedId} />
      )}
      <SystemBugInboxDetailDialog reportId={selectedId} onClose={() => setSelectedId(null)} />
    </Box>
  );
}

function InboxList({
  items,
  onSelect,
}: {
  items: SystemBugInboxItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {items.map((item) => (
        <InboxRow key={item.id} item={item} onSelect={onSelect} />
      ))}
    </Box>
  );
}

function InboxRow({
  item,
  onSelect,
}: {
  item: SystemBugInboxItem;
  onSelect: (id: string) => void;
}) {
  const shotSrc = mediaUrl(item.screenshot_url);
  return (
    <Paper
      variant="outlined"
      onClick={() => onSelect(item.id)}
      sx={{ p: 1.5, display: "flex", gap: 1.5, cursor: "pointer", borderRadius: 2 }}
    >
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
      <Box minWidth={0} flex={1}>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {item.reporter_name || "—"}
          {item.branch_name ? ` · ${item.branch_name}` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.note || he.issueReportMediaOnly}
        </Typography>
        <Typography variant="caption" color="text.secondary" dir="ltr">
          {formatDueAt(item.created_at)}
          {item.audio_url ? ` · ${he.systemBugInboxAudio}` : ""}
        </Typography>
      </Box>
    </Paper>
  );
}
