import { Box, IconButton, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MediaCaptureActions from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";
import { MAX_SLOT_HINT, MAX_SLOT_TITLE, type CompletionRequirement } from "../../utils/completionMedia";

export default function VisualRequirementCard({
  req,
  index,
  disabled,
  onTitle,
  onHint,
  onExample,
  onSeconds,
  onRemove,
}: {
  req: CompletionRequirement;
  index: number;
  disabled: boolean;
  onTitle: (title: string) => void;
  onHint: (hint: string) => void;
  onExample: (url: string, file: File | null) => void;
  onSeconds: (value: string) => void;
  onRemove: () => void;
}) {
  const exampleSrc = mediaUrl(req.example_url || null);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        bgcolor: "action.hover",
        borderRadius: 1.5,
        p: 1.25,
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" fontWeight={600}>
          {he.completionRequirementN(index + 1)} ·{" "}
          {req.kind === "video" ? he.completionReqVideo : he.completionReqPhoto}
        </Typography>
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
      <TextField
        size="small"
        label={he.completionSlotTitle}
        placeholder={he.completionSlotTitleHint}
        value={req.title ?? ""}
        onChange={(e) => onTitle(e.target.value)}
        disabled={disabled}
        inputProps={{ maxLength: MAX_SLOT_TITLE }}
        fullWidth
      />
      <TextField
        size="small"
        label={he.completionSlotHint}
        placeholder={he.completionSlotHintHint}
        value={req.hint ?? ""}
        onChange={(e) => onHint(e.target.value)}
        disabled={disabled}
        multiline
        minRows={2}
        inputProps={{ maxLength: MAX_SLOT_HINT }}
        fullWidth
      />
      {req.kind === "video" && (
        <TextField
          size="small"
          type="number"
          label={he.completionVideoMinSeconds}
          value={req.min_seconds ?? ""}
          onChange={(e) => onSeconds(e.target.value)}
          disabled={disabled}
          inputProps={{ min: 1, max: 600 }}
          sx={{ width: 160 }}
        />
      )}
      <ExamplePhotoField
        title={req.title}
        exampleSrc={exampleSrc}
        disabled={disabled}
        onExample={onExample}
      />
    </Box>
  );
}

function ExamplePhotoField({
  title,
  exampleSrc,
  disabled,
  onExample,
}: {
  title?: string;
  exampleSrc: string | null;
  disabled: boolean;
  onExample: (url: string, file: File | null) => void;
}) {
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        {he.completionSlotExample}
      </Typography>
      <MediaCaptureActions
        photoAdded={Boolean(exampleSrc)}
        videoAdded={false}
        audioAdded={false}
        uploadingKind={null}
        disabled={disabled}
        allowedKinds={["photo"]}
        photoLabel={he.completionSlotExample}
        photoDoneLabel={he.completionRetake}
        onCapture={(file) => onExample(URL.createObjectURL(file), file)}
      />
      {exampleSrc && (
        <Box
          component="img"
          src={exampleSrc}
          alt={title || he.completionSlotExample}
          sx={{ maxWidth: "100%", maxHeight: 140, borderRadius: 1, display: "block" }}
        />
      )}
    </>
  );
}
