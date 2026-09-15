import { Accordion, AccordionDetails, AccordionSummary, Box, Button, IconButton, Stack, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import type { ReactNode } from "react";
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
  type CompletionRequirement,
} from "../../utils/completionMedia";

interface CompletionRequirementsEditorProps {
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
  disabled?: boolean;
  expandSlots?: boolean;
}

function revokeIfBlob(url: string | undefined): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export default function CompletionRequirementsEditor({
  value,
  onChange,
  disabled = false,
  expandSlots = true,
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
      <EditorIntro />
      <RequirementList
        value={value}
        disabled={disabled}
        expandSlots={expandSlots}
        onChange={onChange}
      />
      <AddRequirementButtons canAdd={canAdd} value={value} onChange={onChange} />
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
  expandSlots,
  onChange,
}: {
  value: CompletionRequirement[];
  disabled: boolean;
  expandSlots: boolean;
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
          disabled={disabled}
          expandSlots={expandSlots}
          onChange={onChange}
          value={value}
        />
      ))}
    </Stack>
  );
}

function AddRequirementButtons({
  canAdd,
  value,
  onChange,
}: {
  canAdd: boolean;
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
}) {
  return (
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
  );
}

const SLOT_ACCORDION_SX = {
  bgcolor: "action.hover",
  borderRadius: 1.5,
  "&:before": { display: "none" },
  overflow: "hidden",
};

function kindLabel(kind: CompletionRequirement["kind"]): string {
  if (kind === "video") return he.completionReqVideo;
  if (kind === "audio") return he.completionReqAudio;
  return he.completionReqPhoto;
}

function slotHeading(req: CompletionRequirement, index: number): string {
  const base = `${he.completionRequirementN(index + 1)} · ${kindLabel(req.kind)}`;
  const title = (req.title || "").trim();
  return title ? `${base} · ${title}` : base;
}

function SlotAccordion({
  heading,
  defaultExpanded,
  disabled,
  onRemove,
  children,
}: {
  heading: string;
  defaultExpanded: boolean;
  disabled: boolean;
  onRemove: () => void;
  children?: ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.25 }}>
      <Accordion
        defaultExpanded={defaultExpanded}
        disableGutters
        elevation={0}
        sx={{ ...SLOT_ACCORDION_SX, flex: 1 }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}
        >
          <Typography variant="body2" fontWeight={600}>
            {heading}
          </Typography>
        </AccordionSummary>
        {children ? (
          <AccordionDetails sx={{ pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            {children}
          </AccordionDetails>
        ) : null}
      </Accordion>
      <IconButton size="small" aria-label={he.removeMedia} disabled={disabled} onClick={onRemove} sx={{ mt: 0.75 }}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function RequirementItem({
  req,
  index,
  disabled,
  expandSlots,
  value,
  onChange,
}: {
  req: CompletionRequirement;
  index: number;
  disabled: boolean;
  expandSlots: boolean;
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
}) {
  const heading = slotHeading(req, index);
  const onRemove = () => {
    revokeIfBlob(req.example_url);
    onChange(removeRequirement(value, index));
  };
  if (req.kind === "audio") {
    return (
      <SlotAccordion heading={heading} defaultExpanded={expandSlots} disabled={disabled} onRemove={onRemove} />
    );
  }
  return (
    <SlotAccordion heading={heading} defaultExpanded={expandSlots} disabled={disabled} onRemove={onRemove}>
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
    </SlotAccordion>
  );
}
