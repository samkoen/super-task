import { useEffect, useState } from "react";
import { Box, Button, Dialog, Typography } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import { he } from "../../i18n/he";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
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
  if (item.kind === "video") {
    return (
      <Box
        component="video"
        src={media.src}
        controls
        playsInline
        sx={{ height: 120, maxWidth: 180, borderRadius: 1, bgcolor: "common.black", flex: "0 0 auto" }}
      />
    );
  }
  return (
    <Box
      component="img"
      src={media.src}
      alt={he.taskReferencePhoto}
      sx={{ height: 120, maxWidth: 180, objectFit: "cover", borderRadius: 1, flex: "0 0 auto" }}
    />
  );
}
