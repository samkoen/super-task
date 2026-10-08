import type { ReactNode } from "react";
import { Box, Button } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import { he } from "../../i18n/he";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";
import type { MediaKind } from "./MediaCaptureActions";

type KindState = {
  show: boolean;
  added: boolean;
  disabled: boolean;
  label?: string;
  doneLabel?: string;
  onClick: () => void;
};

type CaptureActionButtonsProps = {
  uploadingKind: MediaKind | null;
  prominent: boolean;
  /** Avec `prominent` : boutons grands mais contourés (actions facultatives). */
  quiet?: boolean;
  photo: KindState;
  video: KindState;
  audio: KindState;
};

const retakeSx = {
  minHeight: 52,
  borderRadius: "14px",
  fontSize: "1.05rem",
  fontWeight: 800,
  borderWidth: 2,
  "&:hover": { borderWidth: 2 },
} as const;

function labelFor(
  kind: MediaKind,
  state: KindState,
  uploadingKind: MediaKind | null,
): string {
  if (uploadingKind === kind) return he.loading;
  const defaults = {
    photo: [he.addPhoto, he.photoAdded],
    video: [he.addVideo, he.videoAdded],
    audio: [he.addAudio, he.audioAdded],
  }[kind];
  return state.added ? state.doneLabel ?? defaults[1] : state.label ?? defaults[0];
}

function KindButton({
  kind,
  state,
  icon,
  uploadingKind,
  prominent,
  quiet,
}: {
  kind: MediaKind;
  state: KindState;
  icon: ReactNode;
  uploadingKind: MediaKind | null;
  prominent: boolean;
  quiet: boolean;
}) {
  if (!state.show) return null;
  const outlined = prominent && (state.added || quiet);
  const variant = prominent ? (outlined ? "outlined" : "contained") : state.added ? "contained" : "outlined";
  const sx = prominent ? (outlined ? retakeSx : employeePrimaryButtonSx) : undefined;
  return (
    <Button
      startIcon={icon}
      variant={variant}
      fullWidth={prominent}
      onClick={state.onClick}
      disabled={state.disabled}
      sx={sx}
    >
      {labelFor(kind, state, uploadingKind)}
    </Button>
  );
}

/** Boutons texte de capture : compacts par défaut, grands et empilés en mode `prominent`. */
export default function CaptureActionButtons({
  uploadingKind,
  prominent,
  quiet = false,
  photo,
  video,
  audio,
}: CaptureActionButtonsProps) {
  return (
    <Box
      sx={
        prominent
          ? { display: "flex", flexDirection: "column", gap: 1, width: "100%" }
          : { display: "flex", flexWrap: "wrap", gap: 1 }
      }
    >
      <KindButton kind="photo" state={photo} icon={<PhotoCameraIcon />} uploadingKind={uploadingKind} prominent={prominent} quiet={quiet} />
      <KindButton kind="video" state={video} icon={<VideocamIcon />} uploadingKind={uploadingKind} prominent={prominent} quiet={quiet} />
      <KindButton kind="audio" state={audio} icon={<MicIcon />} uploadingKind={uploadingKind} prominent={prominent} quiet={quiet} />
    </Box>
  );
}
