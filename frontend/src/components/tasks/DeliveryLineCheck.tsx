import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ApiError } from "../../services/api";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { he } from "../../i18n/he";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";
import DeliveryLineCard from "./DeliveryLineCard";
import DeliveryNoteHeader from "./DeliveryNoteHeader";
import DeliveryOriginList from "./DeliveryOriginList";
import {
  DELIVERY_TASK_ORIGIN,
  canSaveDeliveryLines,
  draftFromLine,
  draftToPayload,
  lineCheckCounts,
  lineFullyOk,
  suggestOverall,
  type DeliveryCheck,
  type DeliveryLineDraft,
  type DeliveryOverall,
} from "../../utils/deliveryNote";

type Props = {
  occurrenceId: string;
  disabled?: boolean;
  onSaved?: () => void;
};

export default function DeliveryLineCheck({ occurrenceId, disabled = false, onSaved }: Props) {
  const [note, setNote] = useState<DeliveryCheck | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    loadCheck(occurrenceId).then((result) => {
      if (cancelled) return;
      if (result === "error") setLoadFailed(true);
      else if (result) setNote(result);
    });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId, attempt]);

  if (loadFailed) return <LoadError onRetry={() => setAttempt(attempt + 1)} />;
  if (!note) return null;
  if (note.task_type === DELIVERY_TASK_ORIGIN) return <DeliveryOriginList note={note} />;
  return (
    <DeliveryLineForm
      occurrenceId={occurrenceId}
      note={note}
      disabled={disabled}
      onSaved={(next) => {
        setNote(next);
        onSaved?.();
      }}
    />
  );
}

/** `null` : la tâche n'a pas de תעודה (404, cas normal). `"error"` : échec réseau ou serveur. */
async function loadCheck(occurrenceId: string): Promise<DeliveryCheck | null | "error"> {
  try {
    return await deliveryNoteService.checkForOccurrence(occurrenceId);
  } catch (err) {
    return err instanceof ApiError && err.status === 404 ? null : "error";
  }
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" onClick={onRetry} sx={{ fontWeight: 800, minHeight: 44 }}>
          {he.mediaCaptureRetry}
        </Button>
      }
    >
      {he.deliveryNoteLoadFailed}
    </Alert>
  );
}

function draftsFrom(note: DeliveryCheck): Record<string, DeliveryLineDraft> {
  return Object.fromEntries(note.lines.map((line) => [line.id, draftFromLine(line)]));
}

function DeliveryLineForm({
  occurrenceId,
  note,
  disabled,
  onSaved,
}: {
  occurrenceId: string;
  note: DeliveryCheck;
  disabled: boolean;
  onSaved: (next: DeliveryCheck) => void;
}) {
  const [drafts, setDrafts] = useState(() => draftsFrom(note));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const rows = note.lines.map((line) => drafts[line.id]);
  const counts = lineCheckCounts(rows);
  const overall = suggestOverall(rows.map((draft) => ({ fully_ok: lineFullyOk(draft) })));
  const blocked = !canSaveDeliveryLines(rows);

  useEffect(() => {
    setDrafts(draftsFrom(note));
  }, [note]);

  const change = (lineId: string, draft: DeliveryLineDraft) => {
    setSaved(false);
    setDrafts({ ...drafts, [lineId]: draft });
  };
  const save = async () => {
    const ok = await saveLines(occurrenceId, note, drafts, setSaving, setError, onSaved);
    setSaved(ok);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <DeliveryNoteHeader note={note} />
      <Typography color="text.secondary">{he.deliveryNoteCheckHint}</Typography>
      {note.lines.map((line) => (
        <DeliveryLineCard
          key={line.id}
          line={line}
          draft={drafts[line.id]}
          disabled={disabled || saving}
          onChange={(draft) => change(line.id, draft)}
          onError={setError}
        />
      ))}
      <CheckFooter
        counts={counts}
        overall={overall}
        error={error}
        blocked={blocked}
        saving={saving}
        saved={saved}
        disabled={disabled || saving || blocked}
        onSave={() => void save()}
      />
    </Box>
  );
}

async function saveLines(
  occurrenceId: string,
  note: DeliveryCheck,
  drafts: Record<string, DeliveryLineDraft>,
  setSaving: (value: boolean) => void,
  setError: (value: string) => void,
  onSaved: (next: DeliveryCheck) => void,
): Promise<boolean> {
  setSaving(true);
  setError("");
  try {
    await deliveryNoteService.submitAnswers(occurrenceId, {
      lines: note.lines.map((line) => draftToPayload(line.id, drafts[line.id])),
    });
    onSaved(await deliveryNoteService.checkForOccurrence(occurrenceId));
    return true;
  } catch (err) {
    setError(err instanceof ApiError ? err.message : he.errorGeneric);
    return false;
  } finally {
    setSaving(false);
  }
}

function CheckFooter({
  counts,
  overall,
  error,
  blocked,
  saving,
  saved,
  disabled,
  onSave,
}: {
  counts: { ok: number; problem: number };
  overall: DeliveryOverall;
  error: string;
  blocked: boolean;
  saving: boolean;
  saved: boolean;
  disabled: boolean;
  onSave: () => void;
}) {
  const accepted = overall === "accepted";
  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Box
        sx={{
          p: 1.5,
          borderRadius: "14px",
          bgcolor: alpha(accepted ? "#2e7d32" : "#d84315", 0.12),
          color: accepted ? "#1b5e20" : "#bf360c",
        }}
      >
        <Typography fontWeight={800} sx={{ color: "inherit" }}>
          {counts.ok} {he.deliveryNoteSummaryOk} · {counts.problem} {he.deliveryNoteNotOk}
          {" · "}
          {overallLabel(overall)}
        </Typography>
      </Box>
      {blocked ? <Typography color="error">{he.deliveryNoteFixNotes}</Typography> : null}
      {error ? <Typography color="error">{error}</Typography> : null}
      {saved ? <Typography fontWeight={800} sx={{ color: "#2e7d32" }}>{he.deliveryNoteSaved}</Typography> : null}
      <Button variant="contained" disabled={disabled} onClick={onSave} sx={employeePrimaryButtonSx}>
        {saving ? <CircularProgress size={24} color="inherit" /> : he.deliveryNoteSave}
      </Button>
    </Box>
  );
}

function overallLabel(status: DeliveryOverall): string {
  return status === "accepted" ? he.deliveryNoteOverallAccepted : he.deliveryNoteLineProblem;
}
