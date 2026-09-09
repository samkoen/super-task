import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { he } from "../../i18n/he";

const sendButtonSx = {
  bgcolor: "primary.main",
  color: "primary.contrastText",
  "&:hover": { bgcolor: "primary.dark" },
  "&.Mui-disabled": {
    bgcolor: "action.disabledBackground",
    color: "action.disabled",
  },
};

export default function EditDialogFooterIcons({
  onCancel,
  onSubmit,
  disabled = false,
  submitDisabled = false,
  submitting = false,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitDisabled?: boolean;
  submitting?: boolean;
}) {
  return (
    <>
      <Tooltip title={he.cancel}>
        <span>
          <IconButton onClick={onCancel} disabled={disabled} aria-label={he.cancel}>
            <CloseIcon />
          </IconButton>
        </span>
      </Tooltip>
      <SubmitSendButton
        onSubmit={onSubmit}
        disabled={disabled || submitDisabled || submitting}
        submitting={submitting}
      />
    </>
  );
}

function SubmitSendButton({
  onSubmit,
  disabled,
  submitting,
}: {
  onSubmit: () => void;
  disabled: boolean;
  submitting: boolean;
}) {
  return (
    <Tooltip title={he.submit}>
      <span>
        <IconButton
          color="primary"
          onClick={onSubmit}
          disabled={disabled}
          aria-label={he.submit}
          sx={sendButtonSx}
        >
          {submitting ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <SendIcon sx={{ transform: "scaleX(-1)" }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}
