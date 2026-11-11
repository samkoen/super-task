import { useRef, useState } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import MediaCaptureActions from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { referenceFileKind } from "../../utils/referenceMediaFile";

type Props = {
  /** URL serveur ou aperçu local (blob:) de la vidéo « איך מצלמים ». */
  url?: string;
  disabled: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
};

/** Le menahel ajoute ici la vidéo d'exemple lue dans l'écran 02 « איך מצלמים סרטון גיבוי ». */
export default function GuideVideoField({ url, disabled, onPick, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  const media = useResolvedMediaSrc(url || null, false);
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        {he.completionGuideVideo}
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="video/*"
          data-testid="guide-video-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const ok = referenceFileKind(file) === "video";
            setInvalid(!ok);
            if (ok) onPick(file);
          }}
        />
        <Button
          variant="outlined"
          startIcon={<VideoLibraryOutlinedIcon />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {url ? he.completionGuideVideoReplace : he.completionGuideVideoPick}
        </Button>
        <MediaCaptureActions
          photoAdded={false}
          videoAdded={false}
          audioAdded={false}
          uploadingKind={null}
          disabled={disabled}
          allowedKinds={["video"]}
          videoLabel={he.completionGuideVideoCapture}
          videoDoneLabel={he.completionGuideVideoCapture}
          onCapture={onPick}
        />
        {url ? (
          <IconButton size="small" aria-label={he.completionGuideVideoRemove} disabled={disabled} onClick={onClear}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        ) : null}
        {invalid ? (
          <Typography variant="caption" color="error" sx={{ flexBasis: "100%" }}>
            {he.completionGuideVideoInvalid}
          </Typography>
        ) : null}
      </Box>
      {url && media.src ? (
        <Box
          component="video"
          data-testid="guide-video-preview"
          src={`${media.src}#t=0.1`}
          controls
          preload="metadata"
          playsInline
          onError={media.onError}
          sx={{ maxWidth: "100%", maxHeight: 140, borderRadius: 1, display: "block" }}
        />
      ) : null}
    </>
  );
}
