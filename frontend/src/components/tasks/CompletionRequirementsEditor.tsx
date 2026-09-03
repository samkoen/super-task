import { useState } from "react";
import { Box, Button, Chip, IconButton, Stack, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import VisualRequirementCard from "./VisualRequirementCard";
import { he } from "../../i18n/he";
import {
  addRequirement,
  applyWordPhotoSlots,
  editorDetailRequirements,
  MAX_COMPLETION_REQUIREMENTS,
  MAX_SLOT_TITLE,
  parseRequirementWords,
  photoWordsFromRequirements,
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
      <RequirementWordList value={value} onChange={onChange} disabled={disabled} />
      {value.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.completionNoRequirements}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {editorDetailRequirements(value).map(({ req, index }) => (
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

function commitWordDraft(value: CompletionRequirement[], extra: string): CompletionRequirement[] {
  const words = parseRequirementWords([...photoWordsFromRequirements(value), extra].join("\n"));
  return applyWordPhotoSlots(value, words);
}

function WordChips({
  words,
  disabled,
  onRemove,
}: {
  words: string[];
  disabled: boolean;
  onRemove: (word: string) => void;
}) {
  return (
    <Box display="flex" flexWrap="wrap" gap={0.75}>
      {words.map((word) => (
        <Chip
          key={word}
          size="small"
          label={word}
          disabled={disabled}
          onDelete={disabled ? undefined : () => onRemove(word)}
          aria-label={`${he.completionWordRemove} ${word}`}
        />
      ))}
    </Box>
  );
}

function WordDraftField({
  draft,
  disabled,
  onDraft,
  onCommit,
}: {
  draft: string;
  disabled: boolean;
  onDraft: (text: string) => void;
  onCommit: (text: string) => void;
}) {
  return (
    <TextField
      size="small"
      fullWidth
      disabled={disabled}
      placeholder={he.completionWordListPlaceholder}
      value={draft}
      inputProps={{ maxLength: MAX_SLOT_TITLE, "aria-label": he.completionWordList }}
      onChange={(e) => {
        const text = e.target.value;
        if (/[\n,،]/.test(text)) onCommit(text);
        else onDraft(text);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || !draft.trim()) return;
        e.preventDefault();
        onCommit(draft);
      }}
    />
  );
}

function RequirementWordList({
  value,
  onChange,
  disabled,
}: {
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const words = photoWordsFromRequirements(value);
  const atCap = value.length >= MAX_COMPLETION_REQUIREMENTS;

  const applyDraft = (text: string) => {
    onChange(commitWordDraft(value, text));
    setDraft("");
  };

  return (
    <Box display="flex" flexDirection="column" gap={0.75}>
      <Typography variant="body2" fontWeight={600}>{he.completionWordList}</Typography>
      <Typography variant="caption" color="text.secondary">{he.completionWordListHint}</Typography>
      <WordChips
        words={words}
        disabled={disabled}
        onRemove={(word) => onChange(applyWordPhotoSlots(value, words.filter((item) => item !== word)))}
      />
      <WordDraftField
        draft={draft}
        disabled={disabled || atCap}
        onDraft={setDraft}
        onCommit={applyDraft}
      />
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
