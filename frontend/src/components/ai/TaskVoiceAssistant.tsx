import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { ApiError } from "../../services/api";
import { aiService, type TaskVoiceDraft } from "../../services/aiService";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { he } from "../../i18n/he";

export interface TaskVoiceFillResult {
  title: string;
  description: string;
  assignee_user_id: string;
  assignee_name?: string;
}

interface TaskVoiceAssistantProps {
  branchId: string;
  taskKind: "fixed" | "ad_hoc";
  disabled?: boolean;
  onFilled: (data: TaskVoiceFillResult) => void;
  onError?: (message: string) => void;
}

export default function TaskVoiceAssistant({
  branchId,
  taskKind,
  disabled = false,
  onFilled,
  onError,
}: TaskVoiceAssistantProps) {
  const { supported, recording, blob, error: recorderError, start, stop, reset } = useAudioRecorder();
  const [processing, setProcessing] = useState(false);
  const [info, setInfo] = useState("");
  const [localError, setLocalError] = useState("");
  const onFilledRef = useRef(onFilled);
  const onErrorRef = useRef(onError);
  onFilledRef.current = onFilled;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!blob) return;
    if (blob.size === 0) {
      setLocalError(he.taskVoiceError);
      reset();
      return;
    }
    if (!branchId) {
      setLocalError(he.taskVoiceNeedBranch);
      reset();
      return;
    }

    let cancelled = false;
    const run = async () => {
      setProcessing(true);
      setLocalError("");
      setInfo("");
      try {
        const draft: TaskVoiceDraft = await aiService.parseTaskFromVoice({
          branchId,
          taskKind,
          file: new File([blob], "manager-voice.webm", { type: blob.type || "audio/webm" }),
        });
        if (cancelled) return;
        onFilledRef.current({
          title: draft.title,
          description: draft.description,
          assignee_user_id: draft.assignee_user_id ?? "",
          assignee_name: draft.assignee_name ?? "",
        });
        const assigneeHint = draft.assignee_name
          ? `${he.assignee}: ${draft.assignee_name}`
          : draft.assignee_user_id
            ? he.assignee
            : he.taskVoiceNoAssignee;
        setInfo(`${he.taskVoiceFilledHint} (${assigneeHint})`);
        reset();
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof ApiError ? e.message : he.taskVoiceError;
        setLocalError(message);
        onErrorRef.current?.(message);
        reset();
      } finally {
        if (!cancelled) setProcessing(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [blob, branchId, reset, taskKind]);

  const recorderMessage =
    recorderError === "permission"
      ? he.taskVoiceMicPermission
      : recorderError === "unsupported"
        ? he.taskVoiceMicUnsupported
        : "";

  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography variant="subtitle2">{he.taskVoiceTitle}</Typography>
      <Typography variant="body2" color="text.secondary">
        {he.taskVoiceHint}
      </Typography>
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
        {!recording ? (
          <Button
            variant="outlined"
            startIcon={processing ? <CircularProgress size={18} /> : <MicIcon />}
            onClick={() => void start()}
            disabled={disabled || processing || !supported || !branchId}
          >
            {processing ? he.taskVoiceProcessing : he.taskVoiceRecord}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stop}
          >
            {he.taskVoiceStop}
          </Button>
        )}
        {recording && (
          <Typography variant="body2" color="error.main">
            {he.taskVoiceRecording}
          </Typography>
        )}
      </Box>
      {recorderMessage && <Alert severity="warning">{recorderMessage}</Alert>}
      {localError && <Alert severity="error">{localError}</Alert>}
      {info && <Alert severity="success">{info}</Alert>}
    </Box>
  );
}
