import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { taskService } from "../../services/taskService";
import { he } from "../../i18n/he";
import DeliveryOriginList from "./DeliveryOriginList";
import {
  DELIVERY_TASK_ORIGIN,
  canSaveDeliveryLines,
  draftFromLine,
  draftToPayload,
  lineAmount,
  lineCheckCounts,
  lineNoteMissing,
  showProblemFields,
  suggestOverall,
  lineFullyOk,
  type DeliveryCheck,
  type DeliveryLineDraft,
  type DeliveryLineView,
  type DeliveryOverall,
} from "../../utils/deliveryNote";

type Props = {
  occurrenceId: string;
  disabled?: boolean;
  onSaved?: () => void;
};

const VALUE_COLUMNS = 5;
const COLUMN_WIDTHS = ["40%", "18%", "14%", "14%", "14%"];

export default function DeliveryLineCheck({ occurrenceId, disabled = false, onSaved }: Props) {
  const [note, setNote] = useState<DeliveryCheck | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCheck(occurrenceId).then((loaded) => {
      if (!cancelled && loaded) setNote(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId]);

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

async function loadCheck(occurrenceId: string): Promise<DeliveryCheck | null> {
  try {
    return await deliveryNoteService.checkForOccurrence(occurrenceId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    return null;
  }
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
  const [error, setError] = useState("");
  const rows = note.lines.map((line) => drafts[line.id]);
  const counts = lineCheckCounts(rows);
  const overall = suggestOverall(rows.map((draft) => ({ fully_ok: lineFullyOk(draft) })));
  const blocked = !canSaveDeliveryLines(rows);

  useEffect(() => {
    setDrafts(draftsFrom(note));
  }, [note]);

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <DeliveryTitle note={note} />
      <DeliveryTable
        note={note}
        drafts={drafts}
        disabled={disabled || saving}
        onChange={(lineId, draft) => setDrafts({ ...drafts, [lineId]: draft })}
      />
      <CheckFooter
        counts={counts}
        overall={overall}
        error={error}
        disabled={disabled || saving || blocked}
        onSave={() => void saveLines(occurrenceId, note, drafts, setSaving, setError, onSaved)}
      />
    </Box>
  );
}

function draftsFrom(note: DeliveryCheck): Record<string, DeliveryLineDraft> {
  return Object.fromEntries(note.lines.map((line) => [line.id, draftFromLine(line)]));
}

async function saveLines(
  occurrenceId: string,
  note: DeliveryCheck,
  drafts: Record<string, DeliveryLineDraft>,
  setSaving: (value: boolean) => void,
  setError: (value: string) => void,
  onSaved: (next: DeliveryCheck) => void,
) {
  setSaving(true);
  setError("");
  try {
    await deliveryNoteService.submitAnswers(occurrenceId, {
      lines: note.lines.map((line) => draftToPayload(line.id, drafts[line.id])),
    });
    const next = await deliveryNoteService.checkForOccurrence(occurrenceId);
    onSaved(next);
  } catch (err) {
    setError(err instanceof ApiError ? err.message : he.errorGeneric);
  } finally {
    setSaving(false);
  }
}

function DeliveryTitle({ note }: { note: DeliveryCheck }) {
  const kind = note.kind === "mixed" ? he.deliveryNoteKindMixed : he.deliveryNoteKindFresh;
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {he.deliveryNotePdf} {note.agroline_number} · {note.customer_name} · {kind}
      </Typography>
      {note.pdf_url ? (
        <Button component="a" href={note.pdf_url} target="_blank" rel="noopener" size="small">
          {he.deliveryNotePdf}
        </Button>
      ) : null}
    </Box>
  );
}

function DeliveryTable({
  note,
  drafts,
  disabled,
  onChange,
}: {
  note: DeliveryCheck;
  drafts: Record<string, DeliveryLineDraft>;
  disabled: boolean;
  onChange: (lineId: string, draft: DeliveryLineDraft) => void;
}) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
      <Box sx={{ ...gutterSx, overflowY: "hidden" }}>
        <Table size="small" sx={tableSx}>
          <ColumnWidths />
          <TableHead>
            <TableRow>
              <TableCell>{he.deliveryNoteColumnProduct}</TableCell>
              <TableCell>{he.deliveryNoteColumnPack}</TableCell>
              <TableCell>{he.deliveryNoteColumnQty}</TableCell>
              <TableCell>{he.deliveryNoteWeight}</TableCell>
              <TableCell align="center">{he.deliveryNoteNotOk}</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </Box>
      <TableContainer sx={{ ...gutterSx, maxHeight: 420, overflowY: "auto" }}>
        <Table size="small" sx={tableSx}>
          <ColumnWidths />
          <TableBody>
            {note.lines.map((line) => (
              <LineRows
                key={line.id}
                line={line}
                draft={drafts[line.id]}
                disabled={disabled}
                onChange={(draft) => onChange(line.id, draft)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

const gutterSx = { direction: "ltr", scrollbarGutter: "stable" } as const;
const tableSx = { direction: "rtl", tableLayout: "fixed" } as const;

function ColumnWidths() {
  return (
    <colgroup>
      {COLUMN_WIDTHS.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );
}

function LineRows({
  line,
  draft,
  disabled,
  onChange,
}: {
  line: DeliveryLineView;
  draft: DeliveryLineDraft;
  disabled: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
}) {
  const problem = showProblemFields(draft);
  const missing = lineNoteMissing(draft);
  return (
    <>
      <TableRow sx={{ bgcolor: rowColor(problem, missing) }}>
        <TableCell><ProductCell line={line} /></TableCell>
        <TableCell>{line.unit}</TableCell>
        <TableCell>{line.quantity}</TableCell>
        <TableCell>{lineAmount(line.weight) ?? ""}</TableCell>
        <TableCell align="center" padding="checkbox">
          <NotOkBox draft={draft} disabled={disabled} onChange={onChange} />
        </TableCell>
      </TableRow>
      {problem ? (
        <TableRow sx={{ bgcolor: rowColor(true, missing) }}>
          <TableCell colSpan={VALUE_COLUMNS}>
            <ProblemFields draft={draft} disabled={disabled} missing={missing} onChange={onChange} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function rowColor(problem: boolean, missing: boolean): string | undefined {
  if (missing) return "rgba(211, 47, 47, 0.10)";
  if (problem) return "rgba(237, 108, 2, 0.12)";
  return undefined;
}

function ProductCell({ line }: { line: DeliveryLineView }) {
  const price = lineAmount(line.price);
  return (
    <Box display="flex" gap={1} alignItems="center">
      <ProductImage line={line} />
      <Box minWidth={0}>
        <Typography variant="body2">{line.product_name}</Typography>
        {line.origin_name?.trim() ? (
          <Typography variant="caption" display="block" color="text.secondary">
            {line.origin_name.trim()}
          </Typography>
        ) : null}
        {price ? (
          <Typography variant="caption" display="block" color="text.secondary">
            {he.deliveryNotePrice} {price}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

function ProductImage({ line }: { line: DeliveryLineView }) {
  const [hidden, setHidden] = useState(false);
  if (!line.image_url || hidden) return null;
  return (
    <Box
      component="img"
      src={line.image_url}
      alt=""
      onError={() => setHidden(true)}
      sx={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

function NotOkBox({
  draft,
  disabled,
  onChange,
}: {
  draft: DeliveryLineDraft;
  disabled: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
}) {
  return (
    <Checkbox
      checked={draft.arrival === "problem"}
      disabled={disabled}
      inputProps={{ "aria-label": he.deliveryNoteNotOk }}
      sx={{ p: 1.25 }}
      onChange={(event) => onChange(markNotOk(draft, event.target.checked))}
    />
  );
}

function markNotOk(draft: DeliveryLineDraft, checked: boolean): DeliveryLineDraft {
  if (!checked) return { arrival: "ok", note: "", photo_url: "" };
  return { ...draft, arrival: "problem" };
}

function ProblemFields({
  draft,
  disabled,
  missing,
  onChange,
}: {
  draft: DeliveryLineDraft;
  disabled: boolean;
  missing: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <TextField
        label={he.deliveryNoteLineNote}
        value={draft.note}
        disabled={disabled}
        required
        error={missing}
        onChange={(event) => onChange({ ...draft, note: event.target.value })}
        fullWidth
        size="small"
      />
      <Button component="label" disabled={disabled} variant="outlined" size="small">
        {he.deliveryNoteLinePhoto}
        <input
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadLinePhoto(file, draft, onChange);
          }}
        />
      </Button>
    </Box>
  );
}

async function uploadLinePhoto(
  file: File,
  draft: DeliveryLineDraft,
  onChange: (draft: DeliveryLineDraft) => void,
) {
  const uploaded = await taskService.uploadPhoto(file);
  onChange({ ...draft, photo_url: uploaded.url });
}

function CheckFooter({
  counts,
  overall,
  error,
  disabled,
  onSave,
}: {
  counts: { ok: number; problem: number };
  overall: DeliveryOverall;
  error: string;
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <Typography variant="body2">
        {counts.ok} {he.deliveryNoteSummaryOk} · {counts.problem} {he.deliveryNoteNotOk}
        {" · "}
        {overallLabel(overall)}
      </Typography>
      {error ? <Typography color="error" variant="caption">{error}</Typography> : null}
      <Button variant="contained" disabled={disabled} onClick={onSave}>
        {he.deliveryNoteSave}
      </Button>
    </>
  );
}

function overallLabel(status: DeliveryOverall): string {
  return status === "accepted" ? he.deliveryNoteOverallAccepted : he.deliveryNoteLineProblem;
}
