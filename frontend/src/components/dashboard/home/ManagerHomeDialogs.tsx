import type { TeamMember, TimelineTask } from "../../../services/dashboardService";
import type { TaskOccurrence } from "../../../services/taskService";
import { he } from "../../../i18n/he";
import { rosterEntry } from "../../../utils/managerTeam";
import TaskChatDialog from "../../tasks/TaskChatDialog";
import TaskCompletionReviewDialog from "../../tasks/TaskCompletionReviewDialog";
import TaskOccurrenceEditDialog from "../../tasks/TaskOccurrenceEditDialog";
import DirectChatScreen from "../../chat/DirectChatScreen";
import ManagerEmployeeSheet from "../../team/ManagerEmployeeSheet";

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
  /** Ferme une fenêtre de l'accueil (le chat direct a sa propre fermeture). */
  onPatch: (patch: Partial<ManagerHomeDialogsState>) => void;
  onCloseDirectChat: () => void;
  onDone: (message?: string) => void;
  onDirectSent: () => void;
};

/** Fenêtres ouvertes depuis l'accueil : chat de tâche, revue de preuve, édition, fiche d'un oved, chat direct. */
export default function ManagerHomeDialogs({ state, branchId, onPatch, onCloseDirectChat, onDone, onDirectSent }: Props) {
  const { chatTask, reviewTarget, editOccurrenceId, member, directChat } = state;
  const close = {
    onCloseChatTask: () => onPatch({ chatTask: null }),
    onCloseReview: () => onPatch({ reviewTarget: null }),
    onCloseEdit: () => onPatch({ editOccurrenceId: null }),
    onCloseMember: () => onPatch({ member: null }),
    onCloseDirectChat,
  };
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
      <ManagerEmployeeSheet entry={member ? rosterEntry(null, member, branchId) : null} onClose={close.onCloseMember} onChanged={() => onDone()} />
      <DirectChatScreen chat={directChat} onClose={close.onCloseDirectChat} onSent={onDirectSent} />
    </>
  );
}
