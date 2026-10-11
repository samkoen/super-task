import { useRef, useState, type RefObject } from "react";
import { Box, Collapse, IconButton, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import MediaCaptureActions from "../media/MediaCaptureActions";
import ExtraCompletionMedia from "./ExtraCompletionMedia";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_INK, employeeFieldSx } from "../../styles/employeeUi";
import {
  appendExtraMedia,
  canAddExtraMedia,
  type ExtraSlot,
} from "../../utils/extraCompletionMedia";

export type OptionalCaptureAccordionProps = {
  note: string;
  onNoteChange: (value: string) => void;
  extras: ExtraSlot[];
  onExtrasChange: (next: ExtraSlot[]) => void;
  disabled?: boolean;
  onAnnotatingChange?: (busy: boolean) => void;
};

function shouldStartOpen(note: string, extras: ExtraSlot[]): boolean {
  return Boolean(note.trim()) || extras.length > 0;
}

/** Note + extras oved : un seul accordéon, 4 icônes (texte, audio, image, vidéo). */
export default function OptionalCaptureAccordion({
  note,
  onNoteChange,
  extras,
  onExtrasChange,
  disabled = false,
  onAnnotatingChange,
}: OptionalCaptureAccordionProps) {
  const [open, setOpen] = useState(() => shouldStartOpen(note, extras));
  const noteRef = useRef<HTMLTextAreaElement>(null);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, px: 0.5 }}>
        {he.captureOptionalToggle}
      </Typography>
      <OptionalCaptureHeader
        open={open}
        disabled={disabled}
        extras={extras}
        onToggle={() => setOpen((value) => !value)}
        onText={() => {
          setOpen(true);
          window.setTimeout(() => noteRef.current?.focus(), 0);
        }}
        onMediaStart={() => setOpen(true)}
        onExtrasChange={onExtrasChange}
        onAnnotatingChange={onAnnotatingChange}
      />
      <Collapse in={open}>
        <OptionalCaptureBody
          note={note}
          noteRef={noteRef}
          extras={extras}
          disabled={disabled}
          onNoteChange={onNoteChange}
          onExtrasChange={onExtrasChange}
          onAnnotatingChange={onAnnotatingChange}
        />
      </Collapse>
    </Box>
  );
}

const headerBarSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  minHeight: 56,
  px: 1,
  borderRadius: "14px",
  bgcolor: alpha(EMPLOYEE_BRAND, 0.06),
} as const;

function OptionalCaptureHeader({
  open,
  disabled,
  extras,
  onToggle,
  onText,
  onMediaStart,
  onExtrasChange,
  onAnnotatingChange,
}: {
  open: boolean;
  disabled: boolean;
  extras: ExtraSlot[];
  onToggle: () => void;
  onText: () => void;
  onMediaStart: () => void;
  onExtrasChange: (next: ExtraSlot[]) => void;
  onAnnotatingChange?: (busy: boolean) => void;
}) {
  return (
    <Box sx={headerBarSx}>
      <Box
        data-testid="optional-capture-icons"
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-evenly", flex: 1 }}
      >
        <IconButton aria-label={he.captureAddText} onClick={onText} sx={{ width: 52, height: 52, color: EMPLOYEE_INK }}>
          <NotesRoundedIcon sx={{ fontSize: 28 }} />
        </IconButton>
        <ExtraMediaTriggers
          extras={extras}
          disabled={disabled}
          onMediaStart={onMediaStart}
          onExtrasChange={onExtrasChange}
          onAnnotatingChange={onAnnotatingChange}
        />
      </Box>
      <IconButton
        aria-label={he.captureOptionalToggle}
        aria-expanded={open}
        onClick={onToggle}
        sx={{ color: EMPLOYEE_INK, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
      >
        <ExpandMoreIcon />
      </IconButton>
    </Box>
  );
}

function ExtraMediaTriggers({
  extras,
  disabled,
  onMediaStart,
  onExtrasChange,
  onAnnotatingChange,
}: {
  extras: ExtraSlot[];
  disabled: boolean;
  onMediaStart: () => void;
  onExtrasChange: (next: ExtraSlot[]) => void;
  onAnnotatingChange?: (busy: boolean) => void;
}) {
  return (
    <Box component="span" onClickCapture={onMediaStart} sx={{ display: "contents" }}>
      <MediaCaptureActions
        density="toolbar"
        photoAdded={false}
        videoAdded={false}
        audioAdded={false}
        uploadingKind={null}
        disabled={disabled || !canAddExtraMedia(extras)}
        onAnnotatingChange={onAnnotatingChange}
        onCapture={(file, kind, meta) =>
          onExtrasChange(appendExtraMedia(extras, kind, file, meta?.durationSeconds))
        }
      />
    </Box>
  );
}

function OptionalCaptureBody({
  note,
  noteRef,
  extras,
  disabled,
  onNoteChange,
  onExtrasChange,
  onAnnotatingChange,
}: {
  note: string;
  noteRef: RefObject<HTMLTextAreaElement | null>;
  extras: ExtraSlot[];
  disabled: boolean;
  onNoteChange: (value: string) => void;
  onExtrasChange: (next: ExtraSlot[]) => void;
  onAnnotatingChange?: (busy: boolean) => void;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1.5 }}>
      <TextField
        inputRef={noteRef}
        label={he.note}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        fullWidth
        multiline
        minRows={3}
        placeholder={he.completionMediaHint}
        sx={employeeFieldSx}
      />
      <ExtraCompletionMedia
        extras={extras}
        onChange={onExtrasChange}
        disabled={disabled}
        onAnnotatingChange={onAnnotatingChange}
        hideTitle
        hideActions
      />
    </Box>
  );
}
