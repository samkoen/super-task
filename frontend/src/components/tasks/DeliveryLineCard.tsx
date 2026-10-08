import type { ReactNode } from "react";
import { Box, Button, ButtonBase, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import { taskService } from "../../services/taskService";
import { he } from "../../i18n/he";
import { employeeCardSx } from "../../styles/employeeUi";
import {
  lineFacts,
  lineNoteMissing,
  showProblemFields,
  type DeliveryLineDraft,
  type DeliveryLineView,
} from "../../utils/deliveryNote";
import DeliveryProductImage from "./DeliveryProductImage";

const OK_COLOR = "#2e7d32";
const PROBLEM_COLOR = "#d84315";

type Props = {
  line: DeliveryLineView;
  draft: DeliveryLineDraft;
  disabled: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
  onError: (message: string) => void;
};

/** Une ligne de teuda : produit et quantités, puis deux gros boutons « תקין / לא תקין ». */
export default function DeliveryLineCard({ line, draft, disabled, onChange, onError }: Props) {
  const problem = showProblemFields(draft);
  const missing = lineNoteMissing(draft);
  return (
    <Box
      sx={{
        ...employeeCardSx,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        borderColor: missing ? "error.main" : problem ? alpha(PROBLEM_COLOR, 0.5) : undefined,
      }}
    >
      <LineSummary line={line} />
      <StatusButtons line={line} problem={problem} disabled={disabled} onChange={onChange} draft={draft} />
      {problem ? (
        <ProblemFields draft={draft} disabled={disabled} missing={missing} onChange={onChange} onError={onError} />
      ) : null}
    </Box>
  );
}

function LineSummary({ line }: { line: DeliveryLineView }) {
  const origin = line.origin_name?.trim();
  return (
    <Box display="flex" gap={1.5} alignItems="center">
      <DeliveryProductImage url={line.image_url} />
      <Box minWidth={0}>
        <Typography fontWeight={800} sx={{ fontSize: "1.1rem" }}>{line.product_name}</Typography>
        {origin ? <Typography color="text.secondary">{origin}</Typography> : null}
        <Typography color="text.secondary" variant="body2">
          {lineFacts(line, { weight: he.deliveryNoteWeight, price: he.deliveryNotePrice })}
        </Typography>
      </Box>
    </Box>
  );
}

function StatusButtons({
  line,
  problem,
  disabled,
  draft,
  onChange,
}: {
  line: DeliveryLineView;
  problem: boolean;
  disabled: boolean;
  draft: DeliveryLineDraft;
  onChange: (draft: DeliveryLineDraft) => void;
}) {
  return (
    <Box display="flex" gap={1.5}>
      <StatusButton
        selected={!problem}
        color={OK_COLOR}
        icon={<CheckCircleOutlineIcon />}
        label={he.deliveryNoteConditionOk}
        ariaLabel={`${he.deliveryNoteConditionOk}: ${line.product_name}`}
        disabled={disabled}
        onClick={() => onChange({ arrival: "ok", note: "", photo_url: "" })}
      />
      <StatusButton
        selected={problem}
        color={PROBLEM_COLOR}
        icon={<ErrorOutlineIcon />}
        label={he.deliveryNoteNotOk}
        ariaLabel={`${he.deliveryNoteNotOk}: ${line.product_name}`}
        disabled={disabled}
        onClick={() => onChange({ ...draft, arrival: "problem" })}
      />
    </Box>
  );
}

function StatusButton({
  selected,
  color,
  icon,
  label,
  ariaLabel,
  disabled,
  onClick,
}: {
  selected: boolean;
  color: string;
  icon: ReactNode;
  label: string;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      sx={{
        flex: 1,
        minHeight: 56,
        gap: 1,
        borderRadius: "14px",
        border: "2px solid",
        borderColor: selected ? color : "divider",
        bgcolor: selected ? alpha(color, 0.12) : "background.paper",
        color: selected ? color : "text.secondary",
        fontWeight: 800,
        fontSize: "1.05rem",
      }}
    >
      {icon}
      {label}
    </ButtonBase>
  );
}

function ProblemFields({
  draft,
  disabled,
  missing,
  onChange,
  onError,
}: {
  draft: DeliveryLineDraft;
  disabled: boolean;
  missing: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
  onError: (message: string) => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <TextField
        label={he.deliveryNoteLineNote}
        value={draft.note}
        disabled={disabled}
        required
        error={missing}
        helperText={missing ? he.deliveryNoteNoteMissingHint : undefined}
        onChange={(event) => onChange({ ...draft, note: event.target.value })}
        fullWidth
        multiline
        minRows={2}
      />
      <Button
        component="label"
        disabled={disabled}
        variant="outlined"
        startIcon={<AddAPhotoOutlinedIcon />}
        sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 700 }}
      >
        {draft.photo_url ? he.deliveryNotePhotoAttached : he.deliveryNoteLinePhoto}
        <input
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadLinePhoto(file, draft, onChange, onError);
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
  onError: (message: string) => void,
) {
  try {
    const uploaded = await taskService.uploadPhoto(file);
    onChange({ ...draft, photo_url: uploaded.url });
  } catch {
    onError(he.errorGeneric);
  }
}
