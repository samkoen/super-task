import type { ReactNode } from "react";
import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import { he } from "../../i18n/he";
import type { MediaKind } from "./MediaCaptureActions";

type CaptureIconToolbarProps = {
  toolbar?: boolean;
  showAudio: boolean;
  showPhoto: boolean;
  showVideo: boolean;
  audioAdded: boolean;
  photoAdded: boolean;
  videoAdded: boolean;
  uploadingKind: MediaKind | null;
  captureDisabled: boolean;
  photoDisabled: boolean;
  videoDisabled: boolean;
  videoLabel?: string;
  videoDoneLabel?: string;
  onAudio: () => void;
  onPhoto: () => void;
  onVideo: () => void;
};

function KindIconButton({
  toolbar,
  title,
  label,
  added,
  disabled,
  loading,
  onClick,
  children,
}: {
  toolbar: boolean;
  title: string;
  label: string;
  added: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size={toolbar ? "medium" : "small"}
          aria-label={label}
          color={added ? "primary" : "default"}
          onClick={onClick}
          disabled={disabled}
          sx={toolbar ? { width: 52, height: 52 } : { p: 0.5 }}
        >
          {loading ? <CircularProgress size={toolbar ? 22 : 16} /> : children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function mediaKindButton(
  show: boolean,
  toolbar: boolean,
  title: string,
  label: string,
  added: boolean,
  disabled: boolean,
  loading: boolean,
  onClick: () => void,
  icon: ReactNode,
) {
  if (!show) return null;
  return (
    <KindIconButton
      toolbar={toolbar}
      title={title}
      label={label}
      added={added}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      {icon}
    </KindIconButton>
  );
}

function MediaKindIcons(props: CaptureIconToolbarProps) {
  const toolbar = Boolean(props.toolbar);
  const iconSize = toolbar ? 28 : 18;
  const videoName = props.videoAdded ? props.videoDoneLabel ?? he.videoAdded : props.videoLabel ?? he.addVideo;
  return (
    <>
      {mediaKindButton(
        props.showAudio, toolbar, props.audioAdded ? he.audioAdded : he.addAudio, he.addAudio,
        props.audioAdded, props.captureDisabled, props.uploadingKind === "audio", props.onAudio,
        <MicIcon sx={{ fontSize: iconSize }} />,
      )}
      {mediaKindButton(
        props.showPhoto, toolbar, props.photoAdded ? he.photoAdded : he.addPhoto, he.addPhoto,
        props.photoAdded, props.photoDisabled, props.uploadingKind === "photo", props.onPhoto,
        <PhotoCameraIcon sx={{ fontSize: iconSize }} />,
      )}
      {mediaKindButton(
        props.showVideo, toolbar, videoName, videoName, props.videoAdded, props.videoDisabled,
        props.uploadingKind === "video", props.onVideo, <VideocamIcon sx={{ fontSize: iconSize }} />,
      )}
    </>
  );
}

/** Rangée d'icônes audio / photo / vidéo (chat compact ou barre oved). */
export default function CaptureIconToolbar(props: CaptureIconToolbarProps) {
  const toolbar = Boolean(props.toolbar);
  return (
    <Box
      display={toolbar ? "contents" : "flex"}
      alignItems="center"
      gap={0.25}
      sx={{ opacity: toolbar ? 1 : 0.75 }}
    >
      <MediaKindIcons {...props} toolbar={toolbar} />
    </Box>
  );
}
