import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { getSystemBug, type SystemBugInboxItem } from "../../services/systemBugService";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";

export default function SystemBugInboxDetailDialog({
  reportId,
  onClose,
  onAskDelete,
}: {
  reportId: string | null;
  onClose: () => void;
  onAskDelete?: (report: SystemBugInboxItem) => void;
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

  const shotSrc = report ? mediaUrl(report.screenshot_url) : null;
  const audioSrc = report ? mediaUrl(report.audio_url) : null;

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
        {report && !loading && <InboxDetailBody report={report} shotSrc={shotSrc} audioSrc={audioSrc} />}
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
  shotSrc,
  audioSrc,
}: {
  report: SystemBugInboxItem;
  shotSrc: string | null;
  audioSrc: string | null;
}) {
  return (
    <>
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
      {!shotSrc && !audioSrc && (
        <Typography variant="body2" color="text.secondary">
          {he.systemBugInboxNoMedia}
        </Typography>
      )}
    </>
  );
}
