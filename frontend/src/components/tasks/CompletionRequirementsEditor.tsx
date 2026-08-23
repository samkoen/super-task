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
  setVideoSeconds,
  type CompletionRequirement,
} from "../../utils/completionMedia";

interface CompletionRequirementsEditorProps {
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
  disabled?: boolean;
}

function revokeIfBlob(url: string | undefined): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export default function CompletionRequirementsEditor({
  value,
  onChange,
  disabled = false,
}: CompletionRequirementsEditorProps) {
  const canAdd = value.length < MAX_COMPLETION_REQUIREMENTS && !disabled;

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
      <Box>
        <Typography variant="subtitle2">{he.completionHowToFinish}</Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {he.completionHowToFinishHint}
        </Typography>
      </Box>
      {value.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.completionNoRequirements}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {value.map((req, index) => (
            <RequirementItem
              key={`${req.kind}-${index}`}
              req={req}
              index={index}
              disabled={disabled}
              onChange={onChange}
              value={value}
            />
          ))}
        </Stack>
      )}
      <Box display="flex" flexWrap="wrap" gap={1}>
        <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => onChange(addRequirement(value, "photo"))} disabled={!canAdd}>
          {he.completionAddPhotoReq}
        </Button>
        <Button size="small" variant="outlined" startIcon={<VideocamIcon />} onClick={() => onChange(addRequirement(value, "video"))} disabled={!canAdd}>
          {he.completionAddVideoReq}
        </Button>
        <Button size="small" variant="outlined" startIcon={<MicIcon />} onClick={() => onChange(addRequirement(value, "audio"))} disabled={!canAdd}>
          {he.completionAddAudioReq}
        </Button>
      </Box>
    </Box>
  );
}

function RequirementItem({
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
  if (req.kind === "audio") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "action.hover", borderRadius: 1, px: 1, py: 0.75 }}>
        <Typography variant="body2" fontWeight={600}>
          {he.completionRequirementN(index + 1)} · {he.completionReqAudio}
        </Typography>
        <IconButton
          size="small"
          aria-label={he.removeMedia}
          onClick={() => onChange(removeRequirement(value, index))}
          disabled={disabled}
          sx={{ mr: "auto" }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }
  return (
    <VisualRequirementCard
      req={req}
      index={index}
      disabled={disabled}
      onTitle={(title) => onChange(setRequirementTitle(value, index, title))}
      onHint={(hint) => onChange(setRequirementHint(value, index, hint))}
      onSeconds={(seconds) => onChange(setVideoSeconds(value, index, seconds))}
      onRemove={() => {
        revokeIfBlob(req.example_url);
        onChange(removeRequirement(value, index));
      }}
      onExample={(url, file) => {
        revokeIfBlob(req.example_url);
        onChange(setRequirementExample(value, index, url, file));
      }}
    />
  );
}
