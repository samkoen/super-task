import { Box, Dialog } from "@mui/material";
import type { TeamMember, TimelineTask } from "../../../services/dashboardService";
import type { TaskOccurrence } from "../../../services/taskService";
import { he } from "../../../i18n/he";
import TaskChatDialog from "../../tasks/TaskChatDialog";
import TaskCompletionReviewDialog from "../../tasks/TaskCompletionReviewDialog";
import TaskOccurrenceEditDialog from "../../tasks/TaskOccurrenceEditDialog";
import DirectChatThread from "../../chat/DirectChatThread";
import FullscreenBackAppBar, { fullscreenChatBodySx, fullscreenChatDialogPaperSx } from "../../chat/FullscreenBackAppBar";
import EmployeeTasksDrawer from "../EmployeeTasksDrawer";

export type ManagerHomeDialogsState = {
  chatTask: TimelineTask | null;
  reviewTarget: TaskOccurrence | null;
  editOccurrenceId: string | null;
  member: TeamMember | null;
  directChat: { id: string; title: string } | null;
};

type Props = {
  state: ManagerHomeDialogsState;
  branchId: string;
  dueOn: string;
  onCloseChatTask: () => void;
  onCloseReview: () => void;
  onCloseEdit: () => void;
  onCloseMember: () => void;
  onCloseDirectChat: () => void;
  onDone: (message?: string) => void;
  onDirectSent: () => void;
};

/** Fenêtres ouvertes depuis l'accueil : chat de tâche, revue de preuve, édition, tâches d'un oved, chat direct. */
export default function ManagerHomeDialogs({ state, branchId, dueOn, onDone, onDirectSent, ...close }: Props) {
  const { chatTask, reviewTarget, editOccurrenceId, member, directChat } = state;
  return (
    <>
      <TaskChatDialog
        open={Boolean(chatTask)}
        occurrenceId={chatTask?.id ?? ""}
        title={chatTask?.title ?? he.taskChatTitle}
        status={chatTask?.status}
        employee={false}
        chatFollowUpAt={chatTask?.chat_follow_up_at}
        chatResolvedAt={chatTask?.chat_resolved_at}
        onClose={() => { close.onCloseChatTask(); onDone(); }}
      />
      <TaskCompletionReviewDialog task={reviewTarget} onClose={close.onCloseReview} onDone={(message) => onDone(message)} />
      <TaskOccurrenceEditDialog occurrenceId={editOccurrenceId} onClose={close.onCloseEdit} onSaved={(message) => onDone(message)} />
      <EmployeeTasksDrawer member={member} branchId={branchId} dueOn={dueOn} onClose={close.onCloseMember} onChanged={() => onDone()} />
      <Dialog fullScreen open={Boolean(directChat)} onClose={close.onCloseDirectChat} dir="rtl" PaperProps={{ sx: fullscreenChatDialogPaperSx }}>
        <FullscreenBackAppBar title={directChat?.title ?? ""} onBack={close.onCloseDirectChat} />
        <Box sx={fullscreenChatBodySx}>
          {directChat ? <DirectChatThread conversationId={directChat.id} onSent={onDirectSent} /> : null}
        </Box>
      </Dialog>
    </>
  );
}
