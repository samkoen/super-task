import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { ApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { taskService, type TaskMessage } from "../../services/taskService";
import { he } from "../../i18n/he";
import { formatTime } from "../../utils/dashboardTime";
import {
  replacePendingMedia,
  revokePendingMedia,
  uploadPendingMedia,
  type PendingMedia,
} from "../../utils/pendingMedia";
import MediaCaptureActions, { type MediaKind } from "../media/MediaCaptureActions";
import CompletionMediaPreview from "./CompletionMediaPreview";

interface TaskChatPanelProps {
  occurrenceId: string;
  onOccurrenceUpdated?: (status: string) => void;
  compact?: boolean;
  /** Si false : fil visible, pas de composition (statut terminé / annulé…). */
  composeEnabled?: boolean;
}

function normalizeMessages(data: unknown): TaskMessage[] {
  if (Array.isArray(data)) return data as TaskMessage[];
  if (data && typeof data === "object" && Array.isArray((data as { messages?: unknown }).messages)) {
    return (data as { messages: TaskMessage[] }).messages;
  }
  return [];
}

export default function TaskChatPanel({
  occurrenceId,
  onOccurrenceUpdated,
  compact = false,
  composeEnabled = true,
}: TaskChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [body, setBody] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<PendingMedia | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingMedia | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<MediaKind | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef({
    photo: null as PendingMedia | null,
    video: null as PendingMedia | null,
    audio: null as PendingMedia | null,
  });

  pendingRef.current = {
    photo: pendingPhoto,
    video: pendingVideo,
    audio: pendingAudio,
  };

  const clearPending = useCallback(() => {
    revokePendingMedia(pendingRef.current.photo);
    revokePendingMedia(pendingRef.current.video);
    revokePendingMedia(pendingRef.current.audio);
    setPendingPhoto(null);
    setPendingVideo(null);
    setPendingAudio(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await taskService.listMessages(occurrenceId);
      setMessages(normalizeMessages(data));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [occurrenceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  useEffect(() => {
    return () => {
      revokePendingMedia(pendingRef.current.photo);
      revokePendingMedia(pendingRef.current.video);
      revokePendingMedia(pendingRef.current.audio);
    };
  }, []);

  const handleCapture = (file: File, kind: MediaKind) => {
    setError("");
    if (kind === "photo") setPendingPhoto((prev) => replacePendingMedia(prev, file));
    else if (kind === "video") setPendingVideo((prev) => replacePendingMedia(prev, file));
    else setPendingAudio((prev) => replacePendingMedia(prev, file));
  };

  const handleSend = async () => {
    if (!body.trim() && !pendingPhoto && !pendingVideo && !pendingAudio) {
      setError(he.taskChatNeedContent);
      return;
    }
    setSending(true);
    setError("");
    try {
      if (pendingPhoto) setUploadingKind("photo");
      const photo_url = await uploadPendingMedia(pendingPhoto, taskService.uploadPhoto);
      if (pendingVideo) setUploadingKind("video");
      const video_url = await uploadPendingMedia(pendingVideo, taskService.uploadVideo);
      if (pendingAudio) setUploadingKind("audio");
      const audio_url = await uploadPendingMedia(pendingAudio, taskService.uploadAudio);
      setUploadingKind(null);

      const result = await taskService.postMessage(occurrenceId, {
        body: body.trim() || undefined,
        photo_url,
        video_url,
        audio_url,
      });
      // Recharger le fil pour que les 2 côtés voient display_* + médias ACL-ok.
      await load();
      setBody("");
      clearPending();
      onOccurrenceUpdated?.(result.occurrence.status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setUploadingKind(null);
      setSending(false);
    }
  };

  const lastEmployeeQuestion = [...messages]
    .reverse()
    .find((m) => m.sender_role === "employee");

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <Typography variant="subtitle2" fontWeight={700}>
        {he.taskChatTitle}
      </Typography>

      {user?.role !== "employee" && lastEmployeeQuestion && (
        <Alert severity="warning" sx={{ alignItems: "flex-start" }}>
          <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>
            {he.taskChatEmployeeQuestion}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {(lastEmployeeQuestion.display_body ?? lastEmployeeQuestion.body)?.trim() ||
              lastEmployeeQuestion.display_audio_transcript ||
              he.taskChatMediaOnly}
          </Typography>
          {(lastEmployeeQuestion.photo_url ||
            lastEmployeeQuestion.video_url ||
            lastEmployeeQuestion.audio_url) && (
            <Box mt={1}>
              <CompletionMediaPreview
                photo_path={lastEmployeeQuestion.photo_url}
                video_path={lastEmployeeQuestion.video_url}
                audio_path={lastEmployeeQuestion.audio_url}
                audio_transcript={
                  lastEmployeeQuestion.display_audio_transcript ??
                  lastEmployeeQuestion.audio_transcript
                }
              />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {lastEmployeeQuestion.sender_name || "—"} · {formatTime(lastEmployeeQuestion.created_at)}
          </Typography>
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={24} />
        </Box>
      ) : messages.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.taskChatEmpty}
        </Typography>
      ) : (
        <Box
          sx={{
            maxHeight: compact ? 220 : 320,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            p: 1.25,
            bgcolor: "grey.100",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {messages.map((msg) => {
            const mine = Boolean(user?.id && msg.sender_user_id === user.id);
            const fromEmployee = msg.sender_role === "employee" || (!mine && !msg.sender_role);
            const text = (msg.display_body ?? msg.body)?.trim();
            const transcript = msg.display_audio_transcript ?? msg.audio_transcript;
            return (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: mine ? "primary.main" : fromEmployee ? "#fff8e1" : "background.paper",
                  color: mine ? "primary.contrastText" : "text.primary",
                  border: mine ? "none" : "1px solid",
                  borderColor: fromEmployee ? "warning.light" : "divider",
                  boxShadow: fromEmployee ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.85, color: mine ? "inherit" : "text.secondary" }}
                  display="block"
                >
                  {msg.sender_name || "—"} · {formatTime(msg.created_at)}
                </Typography>
                {text ? (
                  <Typography
                    variant="body2"
                    fontWeight={fromEmployee && !mine ? 600 : 400}
                    sx={{ whiteSpace: "pre-wrap", color: "inherit" }}
                  >
                    {text}
                  </Typography>
                ) : null}
                {(msg.photo_url || msg.video_url || msg.audio_url || transcript) && (
                  <Box mt={0.75}>
                    <CompletionMediaPreview
                      photo_path={msg.photo_url}
                      video_path={msg.video_url}
                      audio_path={msg.audio_url}
                      audio_transcript={transcript}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
          <div ref={bottomRef} />
        </Box>
      )}

      {composeEnabled && (
        <>
          <TextField
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={he.taskChatPlaceholder}
            fullWidth
            multiline
            minRows={compact ? 2 : 3}
            disabled={sending}
          />
          <MediaCaptureActions
            density="icon"
            photoAdded={Boolean(pendingPhoto)}
            videoAdded={Boolean(pendingVideo)}
            audioAdded={Boolean(pendingAudio)}
            uploadingKind={uploadingKind}
            disabled={sending}
            onCapture={(file, kind) => handleCapture(file, kind)}
          />
          {(pendingPhoto || pendingVideo || pendingAudio) && (
            <CompletionMediaPreview
              photo_path={pendingPhoto?.previewUrl}
              video_path={pendingVideo?.previewUrl}
              audio_path={pendingAudio?.previewUrl}
              disabled={sending}
              onRemovePhoto={() => {
                revokePendingMedia(pendingPhoto);
                setPendingPhoto(null);
              }}
              onRemoveVideo={() => {
                revokePendingMedia(pendingVideo);
                setPendingVideo(null);
              }}
              onRemoveAudio={() => {
                revokePendingMedia(pendingAudio);
                setPendingAudio(null);
              }}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            onClick={() => void handleSend()}
            disabled={sending || Boolean(uploadingKind)}
          >
            {he.taskChatSend}
          </Button>
        </>
      )}
      {!composeEnabled && error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}
