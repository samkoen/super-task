import { useEffect, useState } from "react";
import { Box, Button, Dialog, IconButton, Typography } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { he } from "../../i18n/he";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { useVideoPoster } from "../../hooks/useVideoPoster";
import CompletionExampleDialog from "./CompletionExampleDialog";
import { taskService, type TaskCompletion, type TaskStatus } from "../../services/taskService";
import type { CompletionAttachment } from "../../utils/completionMedia";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { taskChatVisualAttachments } from "../../utils/taskChatVisualMedia";
import FullscreenBackAppBar, {
  fullscreenChatBodySx,
  fullscreenChatDialogPaperSx,
} from "../chat/FullscreenBackAppBar";
import TaskChatPanel from "./TaskChatPanel";

export default function TaskChatDialog({
  open,
  onClose,
  occurrenceId,
  title,
  status,
  employee,
  chatFollowUpAt,
  chatResolvedAt,
  completion,
  onOccurrenceUpdated,
}: {
  open: boolean;
  onClose: () => void;
  occurrenceId: string;
  title: string;
  status?: TaskStatus;
  employee: boolean;
  chatFollowUpAt?: string | null;
  chatResolvedAt?: string | null;
  /** undefined = charger la tâche ; null = déjà connu, sans média. */
  completion?: TaskCompletion | null;
  onOccurrenceUpdated?: (status: string, notice?: string) => void;
}) {
  const media = useTaskChatCompletion(open, occurrenceId, completion);
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      dir="rtl"
      PaperProps={{ sx: fullscreenChatDialogPaperSx }}
    >
      <FullscreenBackAppBar title={title || he.taskChatTitle} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        <TaskChatMediaStrip completion={media} employee={employee} />
        {open && occurrenceId ? (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <TaskChatPanel
              occurrenceId={occurrenceId}
              occurrenceStatus={status}
              chatFollowUpAt={chatFollowUpAt}
              chatResolvedAt={chatResolvedAt}
              composeEnabled={status ? canComposeTaskChat(status, employee) : false}
              onOccurrenceUpdated={onOccurrenceUpdated}
            />
          </Box>
        ) : null}
      </Box>
    </Dialog>
  );
}

export function OpenTaskChatButton({
  occurrenceId,
  title,
  status,
  employee,
  chatFollowUpAt,
  chatResolvedAt,
  completion,
  onOccurrenceUpdated,
  autoOpen = false,
}: {
  occurrenceId: string;
  title: string;
  status?: TaskStatus;
  employee: boolean;
  chatFollowUpAt?: string | null;
  chatResolvedAt?: string | null;
  completion?: TaskCompletion | null;
  onOccurrenceUpdated?: (status: string, notice?: string) => void;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen, occurrenceId]);
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ChatIcon />}
        onClick={() => setOpen(true)}
        sx={{ alignSelf: "flex-start", minHeight: 48, px: 2, fontWeight: 800 }}
      >
        {he.taskChatSection}
      </Button>
      <TaskChatDialog
        open={open}
        onClose={() => setOpen(false)}
        occurrenceId={occurrenceId}
        title={title}
        status={status}
        employee={employee}
        chatFollowUpAt={chatFollowUpAt}
        chatResolvedAt={chatResolvedAt}
        completion={completion}
        onOccurrenceUpdated={onOccurrenceUpdated}
      />
    </>
  );
}

function useTaskChatCompletion(
  open: boolean,
  occurrenceId: string,
  completion: TaskCompletion | null | undefined,
) {
  const [loaded, setLoaded] = useState<TaskCompletion | null>(completion ?? null);
  useEffect(() => {
    setLoaded(completion ?? null);
  }, [completion]);
  useEffect(() => {
    if (!open || completion !== undefined || !taskService.getOccurrence) return undefined;
    let stop = false;
    void taskService
      .getOccurrence(occurrenceId)
      .then((task) => {
        if (!stop) setLoaded(task.completion ?? null);
      })
      .catch(() => {
        if (!stop) setLoaded(null);
      });
    return () => {
      stop = true;
    };
  }, [open, occurrenceId, completion]);
  return loaded;
}

function TaskChatMediaStrip({
  completion,
  employee,
}: {
  completion: TaskCompletion | null;
  employee: boolean;
}) {
  const items = taskChatVisualAttachments(completion);
  if (!items.length) return null;
  return (
    <Box sx={{ flexShrink: 0, mb: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {employee ? he.completionMediaAdded : he.completionMediaFromEmployee}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5 }}>
        {items.map((item, index) => (
          <TaskChatMediaThumb key={`${item.kind}-${item.url}-${index}`} item={item} />
        ))}
      </Box>
    </Box>
  );
}

function TaskChatMediaThumb({ item }: { item: CompletionAttachment }) {
  const remote = Boolean(item.url && !item.url.startsWith("blob:"));
  const media = useResolvedMediaSrc(item.url, remote);
  if (!media.src) return null;
  if (item.kind === "video") return <TaskChatVideoThumb item={item} src={media.src} />;
  return (
    <Box
      component="img"
      src={media.src}
      alt={he.taskReferencePhoto}
      sx={{ height: 120, maxWidth: 180, objectFit: "cover", borderRadius: 1, flex: "0 0 auto" }}
    />
  );
}

function TaskChatVideoThumb({ item, src }: { item: CompletionAttachment; src: string }) {
  const [playing, setPlaying] = useState(false);
  const poster = useChatVideoPoster(item.poster_url, src);
  return (
    <>
      <Box sx={chatVideoThumbSx}>
        <ChatVideoFrame poster={poster} src={src} />
        <IconButton aria-label={he.completionPlayVideo} onClick={() => setPlaying(true)} sx={chatPlayButtonSx}>
          <PlayArrowIcon />
        </IconButton>
      </Box>
      {playing ? (
        <CompletionExampleDialog
          src={src}
          title={he.completionReqVideo}
          kind="video"
          onClose={() => setPlaying(false)}
        />
      ) : null}
    </>
  );
}

function useChatVideoPoster(posterUrl: string | undefined, src: string): string | null {
  const remote = Boolean(posterUrl && !posterUrl.startsWith("blob:"));
  const stored = useResolvedMediaSrc(posterUrl ?? null, remote);
  const captured = useVideoPoster(stored.src ? null : src);
  return stored.src || captured;
}

function ChatVideoFrame({ poster, src }: { poster: string | null; src: string }) {
  if (poster) {
    return (
      <Box
        component="img"
        src={poster}
        alt={he.completionReqVideo}
        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <Box
      component="video"
      src={src}
      muted
      playsInline
      preload="metadata"
      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
    />
  );
}

const chatVideoThumbSx = {
  position: "relative",
  width: 120,
  height: 120,
  flex: "0 0 auto",
  overflow: "hidden",
  borderRadius: 1,
  bgcolor: "common.black",
} as const;

const chatPlayButtonSx = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 2,
  width: 48,
  height: 48,
  bgcolor: "rgba(0,0,0,0.55)",
  color: "common.white",
  "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
} as const;
