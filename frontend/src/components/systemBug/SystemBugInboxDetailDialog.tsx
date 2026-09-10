import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import {
  patchSystemBug,
  getSystemBug,
  type SystemBugInboxComment,
  type SystemBugInboxItem,
} from "../../services/systemBugService";
import { mediaUrl } from "../../utils/mediaUrl";
import { formatDueAt } from "../../utils/dateView";
import { canSubmitSystemBugComment, isSystemBugOpen } from "../../utils/systemBugInbox";
import { he } from "../../i18n/he";

export default function SystemBugInboxDetailDialog({
  reportId,
  onClose,
  onAskDelete,
  onUpdated,
}: {
  reportId: string | null;
  onClose: () => void;
  onAskDelete?: (report: SystemBugInboxItem) => void;
  onUpdated?: (report: SystemBugInboxItem) => void;
}) {
  const [report, setReport] = useState<SystemBugInboxItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    void getSystemBug(reportId)
      .then(setReport)
      .catch((e) => setError(e instanceof ApiError ? e.message : he.errorGeneric))
      .finally(() => setLoading(false));
  }, [reportId]);

  return (
    <Dialog open={!!reportId} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.systemBugInbox}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && <Typography color="error">{error}</Typography>}
        {report && !loading && (
          <InboxDetailBody
            report={report}
            onPatched={(next) => {
              setReport(next);
              onUpdated?.(next);
            }}
            onError={setError}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        {report && onAskDelete && (
          <Button color="error" onClick={() => onAskDelete(report)} sx={{ marginInlineEnd: "auto" }}>
            {he.systemBugInboxDelete}
          </Button>
        )}
        <Button onClick={onClose}>{he.close}</Button>
      </DialogActions>
    </Dialog>
  );
}

function InboxDetailBody({
  report,
  onPatched,
  onError,
}: {
  report: SystemBugInboxItem;
  onPatched: (report: SystemBugInboxItem) => void;
  onError: (message: string) => void;
}) {
  const open = isSystemBugOpen(report.status);
  const shotSrc = mediaUrl(report.screenshot_url);
  const audioSrc = mediaUrl(report.audio_url);
  return (
    <>
      <Chip
        size="small"
        label={open ? he.systemBugInboxOpen : he.systemBugInboxClosed}
        color={open ? "success" : "default"}
        sx={{ alignSelf: "flex-start" }}
      />
      <Typography variant="body2" color="text.secondary">
        {he.systemBugInboxFrom}: <strong>{report.reporter_name || "—"}</strong>
        {report.branch_name ? ` · ${report.branch_name}` : ""}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {he.systemBugInboxRoute}: {report.route || "—"}
      </Typography>
      {report.note ? (
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {report.note}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {he.issueReportMediaOnly}
        </Typography>
      )}
      <InboxMedia shotSrc={shotSrc} audioSrc={audioSrc} />
      <InboxComments comments={report.comments ?? []} />
      <InboxCommentForm report={report} open={open} onPatched={onPatched} onError={onError} />
    </>
  );
}

function InboxMedia({ shotSrc, audioSrc }: { shotSrc: string | null; audioSrc: string | null }) {
  if (!shotSrc && !audioSrc) {
    return (
      <Typography variant="body2" color="text.secondary">
        {he.systemBugInboxNoMedia}
      </Typography>
    );
  }
  return (
    <>
      {shotSrc && (
        <Box
          component="img"
          src={shotSrc}
          alt={he.systemBugInboxScreenshot}
          sx={{
            width: "100%",
            maxHeight: 360,
            objectFit: "contain",
            borderRadius: 1,
            bgcolor: "action.hover",
          }}
        />
      )}
      {audioSrc && (
        <Box component="audio" src={audioSrc} controls preload="metadata" sx={{ width: "100%" }} />
      )}
    </>
  );
}

function InboxComments({ comments }: { comments: SystemBugInboxComment[] }) {
  if (comments.length === 0) return null;
  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        {he.systemBugInboxComments}
      </Typography>
      {comments.map((item, index) => (
        <Box key={`${item.created_at}-${index}`} sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}>
          <Typography variant="caption" color="text.secondary">
            {item.author_name}
            {item.created_at ? ` · ${formatDueAt(item.created_at)}` : ""}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {item.body}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function InboxCommentForm({
  report,
  open,
  onPatched,
  onError,
}: {
  report: SystemBugInboxItem;
  open: boolean;
  onPatched: (report: SystemBugInboxItem) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const canSend = canSubmitSystemBugComment(draft);
  const save = (payload: { status?: "open" | "closed"; comment?: string }) => {
    void submitInboxComment({
      reportId: report.id,
      payload,
      onPatched,
      onError,
      setDraft,
      setSaving,
    });
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <TextField
        label={he.systemBugInboxComment}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        placeholder={he.systemBugInboxCommentHint}
        disabled={saving}
      />
      <Box display="flex" gap={1} flexWrap="wrap">
        <Button variant="outlined" disabled={!canSend || saving} onClick={() => save({ comment: draft })}>
          {he.systemBugInboxAddComment}
        </Button>
        {open && (
          <Button
            variant="contained"
            color="success"
            disabled={!canSend || saving}
            onClick={() => save({ status: "closed", comment: draft })}
          >
            {he.systemBugInboxClose}
          </Button>
        )}
      </Box>
    </Box>
  );
}

async function submitInboxComment(opts: {
  reportId: string;
  payload: { status?: "open" | "closed"; comment?: string };
  onPatched: (report: SystemBugInboxItem) => void;
  onError: (message: string) => void;
  setDraft: (value: string) => void;
  setSaving: (value: boolean) => void;
}) {
  opts.setSaving(true);
  opts.onError("");
  try {
    const next = await patchSystemBug(opts.reportId, opts.payload);
    opts.setDraft("");
    opts.onPatched(next);
  } catch (e) {
    opts.onError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    opts.setSaving(false);
  }
}
