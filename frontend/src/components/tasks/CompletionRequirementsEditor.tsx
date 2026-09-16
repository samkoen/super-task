import { useState } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import VisualRequirementCard from "./VisualRequirementCard";
import { he } from "../../i18n/he";
import {
  addRequirement,
  MAX_COMPLETION_REQUIREMENTS,
  removeRequirement,
  setRequirementExample,
  setRequirementHint,
  setRequirementTitle,
  commitVideoSeconds,
  setVideoSeconds,
  type CompletionKind,
  type CompletionRequirement,
} from "../../utils/completionMedia";
import {
  nextOpenIndexAfterRemove,
  requirementKindLabel,
  requirementRowLabel,
  requirementRowName,
} from "../../utils/completionRequirementList";

interface CompletionRequirementsEditorProps {
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
  disabled?: boolean;
}

function revokeIfBlob(url: string | undefined): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function useOpenRequirement(
  value: CompletionRequirement[],
  onChange: (next: CompletionRequirement[]) => void,
) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const add = (kind: CompletionKind) => {
    const next = addRequirement(value, kind);
    if (next.length === value.length) return;
    onChange(next);
    setOpenIndex(next.length - 1);
  };

  const remove = (index: number) => {
    revokeIfBlob(value[index]?.example_url);
    onChange(removeRequirement(value, index));
    setOpenIndex((current) => nextOpenIndexAfterRemove(current, index));
  };

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return { openIndex, add, remove, toggle };
}

export default function CompletionRequirementsEditor({
  value,
  onChange,
  disabled = false,
}: CompletionRequirementsEditorProps) {
  const canAdd = value.length < MAX_COMPLETION_REQUIREMENTS && !disabled;
  const { openIndex, add, remove, toggle } = useOpenRequirement(value, onChange);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <EditorIntro />
      <RequirementList
        value={value}
        disabled={disabled}
        openIndex={openIndex}
        onToggle={toggle}
        onRemove={remove}
        onChange={onChange}
      />
      <AddRequirementButtons canAdd={canAdd} onAdd={add} />
    </Box>
  );
}

function EditorIntro() {
  return (
    <Box>
      <Typography variant="subtitle2">{he.completionHowToFinish}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {he.completionHowToFinishHint}
      </Typography>
    </Box>
  );
}

function RequirementList({
  value,
  disabled,
  openIndex,
  onToggle,
  onRemove,
  onChange,
}: {
  value: CompletionRequirement[];
  disabled: boolean;
  openIndex: number | null;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  onChange: (next: CompletionRequirement[]) => void;
}) {
  if (value.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {he.completionNoRequirements}
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {value.map((req, index) => (
        <RequirementItem
          key={`${req.kind}-${index}`}
          req={req}
          index={index}
          open={openIndex === index}
          disabled={disabled}
          onToggle={() => onToggle(index)}
          onRemove={() => onRemove(index)}
          value={value}
          onChange={onChange}
        />
      ))}
    </Stack>
  );
}

function AddRequirementButtons({
  canAdd,
  onAdd,
}: {
  canAdd: boolean;
  onAdd: (kind: CompletionKind) => void;
}) {
  return (
    <Box display="flex" flexWrap="wrap" gap={1}>
      <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => onAdd("photo")} disabled={!canAdd}>
        {he.completionAddPhotoReq}
      </Button>
      <Button size="small" variant="outlined" startIcon={<VideocamIcon />} onClick={() => onAdd("video")} disabled={!canAdd}>
        {he.completionAddVideoReq}
      </Button>
      <Button size="small" variant="outlined" startIcon={<MicIcon />} onClick={() => onAdd("audio")} disabled={!canAdd}>
        {he.completionAddAudioReq}
      </Button>
    </Box>
  );
}

function RequirementItem({
  req,
  index,
  open,
  disabled,
  onToggle,
  onRemove,
  value,
  onChange,
}: {
  req: CompletionRequirement;
  index: number;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
}) {
  return (
    <Box
      sx={{
        bgcolor: open ? "action.selected" : "action.hover",
        borderRadius: 1.5,
        overflow: "hidden",
      }}
    >
      <RequirementRow req={req} open={open} disabled={disabled} onToggle={onToggle} onRemove={onRemove} />
      {open && (
        <RequirementSquare req={req} index={index} disabled={disabled} value={value} onChange={onChange} />
      )}
    </Box>
  );
}

const ROW_BUTTON_SX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 1,
  flex: 1,
  minHeight: 48,
  px: 1,
  border: 0,
  bgcolor: "transparent",
  font: "inherit",
  color: "inherit",
  textAlign: "start",
} as const;

function RequirementRow({
  req,
  open,
  disabled,
  onToggle,
  onRemove,
}: {
  req: CompletionRequirement;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const label = requirementRowLabel(req);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 0.5 }}>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        sx={{ ...ROW_BUTTON_SX, cursor: disabled ? "default" : "pointer" }}
      >
        <Typography variant="body2" fontWeight={600}>
          {requirementRowName(req)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {requirementKindLabel(req.kind)}
        </Typography>
      </Box>
      <IconButton size="small" aria-label={he.removeMedia} disabled={disabled} onClick={onRemove}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function RequirementSquare({
  req,
  index,
  disabled,
  value,
  onChange,
}: {
  req: CompletionRequirement;
  index: number;
  disabled: boolean;
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
}) {
  return (
    <Box sx={{ px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <VisualRequirementCard
        req={req}
        disabled={disabled}
        onTitle={(title) => onChange(setRequirementTitle(value, index, title))}
        onHint={(hint) => onChange(setRequirementHint(value, index, hint))}
        onSeconds={(seconds) => onChange(setVideoSeconds(value, index, seconds))}
        onSecondsCommit={() => onChange(commitVideoSeconds(value, index))}
        onExample={(url, file) => {
          revokeIfBlob(req.example_url);
          onChange(setRequirementExample(value, index, url, file));
        }}
      />
    </Box>
  );
}
