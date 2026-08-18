import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import { he } from "../../i18n/he";
import {
  addRequirement,
  MAX_COMPLETION_REQUIREMENTS,
  removeRequirement,
  setVideoSeconds,
  type CompletionKind,
  type CompletionRequirement,
} from "../../utils/completionMedia";

interface CompletionRequirementsEditorProps {
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
  disabled?: boolean;
}

const KIND_LABEL: Record<CompletionKind, string> = {
  photo: he.completionReqPhoto,
  video: he.completionReqVideo,
  audio: he.completionReqAudio,
};

export default function CompletionRequirementsEditor({
  value,
  onChange,
  disabled = false,
}: CompletionRequirementsEditorProps) {
  const canAdd = value.length < MAX_COMPLETION_REQUIREMENTS && !disabled;

  const add = (kind: CompletionKind) => {
    onChange(addRequirement(value, kind));
  };

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
            <RequirementRow
              key={`${req.kind}-${index}`}
              req={req}
              index={index}
              disabled={disabled}
              onRemove={() => onChange(removeRequirement(value, index))}
              onSeconds={(seconds) => onChange(setVideoSeconds(value, index, seconds))}
            />
          ))}
        </Stack>
      )}
      <Box display="flex" flexWrap="wrap" gap={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PhotoCameraIcon />}
          onClick={() => add("photo")}
          disabled={!canAdd}
        >
          {he.completionAddPhotoReq}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<VideocamIcon />}
          onClick={() => add("video")}
          disabled={!canAdd}
        >
          {he.completionAddVideoReq}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<MicIcon />}
          onClick={() => add("audio")}
          disabled={!canAdd}
        >
          {he.completionAddAudioReq}
        </Button>
      </Box>
    </Box>
  );
}

function RequirementRow({
  req,
  index,
  disabled,
  onRemove,
  onSeconds,
}: {
  req: CompletionRequirement;
  index: number;
  disabled: boolean;
  onRemove: () => void;
  onSeconds: (value: string) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
        bgcolor: "action.hover",
        borderRadius: 1,
        px: 1,
        py: 0.75,
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 72 }}>
        {he.completionRequirementN(index + 1)}
      </Typography>
      <Typography variant="body2">{KIND_LABEL[req.kind]}</Typography>
      {req.kind === "video" && (
        <TextField
          size="small"
          type="number"
          label={he.completionVideoMinSeconds}
          value={req.min_seconds ?? ""}
          onChange={(e) => onSeconds(e.target.value)}
          disabled={disabled}
          inputProps={{ min: 1, max: 600 }}
          sx={{ width: 140 }}
        />
      )}
      <IconButton
        size="small"
        aria-label={he.removeMedia}
        onClick={onRemove}
        disabled={disabled}
        sx={{ mr: "auto" }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
