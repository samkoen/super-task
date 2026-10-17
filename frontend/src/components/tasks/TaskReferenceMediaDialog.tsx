import { Dialog, DialogContent, DialogTitle, IconButton, Box } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TaskReferenceMediaDisplay from "./TaskReferenceMediaDisplay";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";

export type TaskReferenceMedia = {
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
};

/** Le menahel a-t-il joint une image, une vidéo ou un audio d'exemple à la tâche ? */
export function hasTaskReferenceMedia(media: TaskReferenceMedia): boolean {
  return Boolean(
    mediaUrl(media.reference_photo_url ?? null) ||
      mediaUrl(media.reference_video_url ?? null) ||
      mediaUrl(media.reference_audio_url ?? null),
  );
}

/** Ajouts du menahel (image, vidéo, audio d'exemple), ouverts depuis l'icône « ? » en haut de la tâche. */
export default function TaskReferenceMediaDialog({
  open,
  media,
  onClose,
}: {
  open: boolean;
  media: TaskReferenceMedia;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle component="div" sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800 }}>
        <Box flex={1} minWidth={0}>
          {he.taskReferenceMediaLabel}
        </Box>
        <IconButton aria-label={he.close} onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <TaskReferenceMediaDisplay
          hideLabel
          reference_photo_url={media.reference_photo_url}
          reference_video_url={media.reference_video_url}
          reference_audio_url={media.reference_audio_url}
        />
      </DialogContent>
    </Dialog>
  );
}
