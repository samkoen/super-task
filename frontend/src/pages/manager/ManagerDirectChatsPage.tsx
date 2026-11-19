import { useCallback, useMemo, useRef, useState } from "react";
import { Box, Dialog } from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import { useFeedback } from "../../context/FeedbackContext";
import { useManagerPageHeader } from "../../context/ManagerPageHeaderContext";
import { he } from "../../i18n/he";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import DirectChatThread from "../../components/chat/DirectChatThread";
import ChatListRow from "../../components/chat/employeeInbox/ChatListRow";
import { ChatPersonAvatar } from "../../components/chat/employeeInbox/ChatAvatars";
import { ChatFilterChip, ChatSearchField } from "../../components/chat/employeeInbox/ChatListControls";
import { chatUi } from "../../styles/employeeChatUi";
import FullscreenBackAppBar, {
  fullscreenChatBodySx,
  fullscreenChatDialogPaperSx,
} from "../../components/chat/FullscreenBackAppBar";
import TaskChatDialog from "../../components/tasks/TaskChatDialog";
import { directChatService, type DirectChatCard } from "../../services/directChatService";
import { useShellManagerScope } from "../../context/ManagerScopeContext";
import {
  filterManagerInbox,
  scopeManagerInbox,
  type ManagerChatsFilter,
  type ManagerInboxEntry,
  type ManagerInboxTask,
} from "../../utils/managerChatInbox";
import { useManagerUnifiedChats } from "../../hooks/useManagerUnifiedChats";

const BROADCAST_ICON = <CampaignOutlinedIcon sx={{ fontSize: 26, color: "#4b5563" }} />;

/** Mêmes Filter Chip que la liste oved (Figma « צ׳אט כללי »), adaptés au menahel. */
const FILTERS: { id: ManagerChatsFilter; label: string }[] = [
  { id: "all", label: he.managerChatsFilterAll },
  { id: "action", label: he.employeeChatsFilterAction },
  { id: "pending", label: he.employeeChatsFilterPending },
  { id: "tasks", label: he.managerChatsFilterTasks },
  { id: "directs", label: he.managerChatsFilterDirects },
];

/**
 * Onglet שיחות unifié (étape 7), au rendu de la liste oved (Figma « צ׳אט כללי · עובד ») : Chat Row,
 * Search Field et Filter Chip partagés, avatar = la personne (+ pastille du type de tâche). Les chats
 * directs et les fils de tâche sont mélangés, « ממתין לי » en tête, filtrables par pastille.
 * « שליחה לכולם » devient un rond dans l'en-tête de la coque.
 */
export default function ManagerDirectChatsPage() {
  const state = useUnifiedChatsState();
  useManagerPageHeader(he.directChatTitle, undefined, state.broadcastAction);

  return (
    <Box sx={{ fontFamily: chatUi.font }}>
      <Box sx={{ pb: 1.5 }}>
        <ChatSearchField value={state.query} onChange={state.setQuery} placeholder={he.directChatSearch} />
      </Box>
      <ChatsFilterPills active={state.filter} actionCount={state.actionCount} onSelect={state.setFilter} />
      <InboxBody state={state} />
      <DirectThreadDialog state={state} />
      <TaskThreadDialog state={state} />
      <BroadcastDialog state={state} />
    </Box>
  );
}

function useUnifiedChatsState() {
  const feedback = useFeedback();
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;
  const onError = useCallback((message: string) => feedbackRef.current.showError(message), []);
  const chats = useManagerUnifiedChats(onError);

  const [filter, setFilter] = useState<ManagerChatsFilter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<{ id: string; title: string } | null>(null);
  const [task, setTask] = useState<ManagerInboxTask | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const openDirect = useCallback(async (card: DirectChatCard) => {
    try {
      const opened = card.kind === "up"
        ? await directChatService.openMine(card.scope === "network" ? "network" : undefined)
        : await directChatService.openWith(card.counterpart_user_id);
      const title = card.kind === "up" ? he.directChatManagerTitle : card.counterpart_name;
      setOpen({ id: opened.conversation.id, title });
    } catch {
      feedbackRef.current.showError(he.errorGeneric);
    }
  }, []);

  const openBroadcast = useCallback(() => setBroadcastOpen(true), []);
  const broadcastAction = useMemo(
    () => ({ icon: BROADCAST_ICON, label: he.directChatBroadcast, onClick: openBroadcast, testId: "manager-chats-broadcast" }),
    [openBroadcast],
  );

  // Menahel reshet : le snif choisi dans l'en-tête restreint la boîte (vide = toute la reshet).
  const scopeBranchId = useShellManagerScope()?.branchId ?? "";
  const visible = useMemo(
    () => filterManagerInbox(scopeManagerInbox(chats.entries, scopeBranchId), filter, query),
    [chats.entries, scopeBranchId, filter, query],
  );
  const actionCount = useMemo(
    () => scopeManagerInbox(chats.entries, scopeBranchId).filter((entry) => entry.waiting).length,
    [chats.entries, scopeBranchId],
  );
  return {
    ...chats, filter, setFilter, query, setQuery, open, setOpen, task, setTask,
    broadcastOpen, setBroadcastOpen, openDirect, broadcastAction, visible, actionCount,
  };
}

type State = ReturnType<typeof useUnifiedChatsState>;

function ChatsFilterPills({
  active,
  actionCount,
  onSelect,
}: {
  active: ManagerChatsFilter;
  actionCount: number;
  onSelect: (f: ManagerChatsFilter) => void;
}) {
  return (
    <Box
      role="toolbar"
      aria-label={he.managerChatsFilterLabel}
      sx={{ display: "flex", gap: 1, pt: 1, pb: 1.5, overflowX: "auto", scrollbarWidth: "none" }}
    >
      {FILTERS.map(({ id, label }) => (
        <ChatFilterChip
          key={id}
          testId={`manager-chats-filter-${id}`}
          label={label}
          active={active === id}
          count={id === "action" ? actionCount : 0}
          onClick={() => onSelect(id)}
        />
      ))}
    </Box>
  );
}

function InboxBody({ state }: { state: State }) {
  if (state.loading) return <ListSkeleton />;
  if (state.visible.length === 0) {
    const title = state.entries.length ? he.directChatNoSearchResults : he.managerChatsEmpty;
    return <EmptyState title={title} icon={<ChatOutlinedIcon fontSize="inherit" />} />;
  }
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, mx: -1, p: 0 }}>
      {state.visible.map((entry) => (
        <Box component="li" key={entry.key}>
          <InboxRowItem entry={entry} state={state} />
        </Box>
      ))}
    </Box>
  );
}

/** Fil de tâche : titre = tâche, aperçu « oved: message » ; direct : titre = personne (· snif). */
function InboxRowItem({ entry, state }: { entry: ManagerInboxEntry; state: State }) {
  const preview = entry.preview || he.chatRowEmpty;
  if (entry.kind === "task" && entry.task) {
    const task = entry.task;
    return (
      <ChatListRow
        testId={`manager-chat-${entry.key}`}
        avatar={<ChatPersonAvatar name={entry.avatarName} photoUrl={entry.avatarUrl} kind={entry.visualKind} />}
        title={entry.title}
        sender={entry.context}
        preview={preview}
        time={entry.lastAt}
        unread={entry.unread}
        status={entry.chatStatus ?? null}
        lastMine={entry.lastMine}
        onClick={() => state.setTask(task)}
      />
    );
  }
  const card = entry.direct!;
  return (
    <ChatListRow
      testId={`manager-chat-${entry.key}`}
      avatar={<ChatPersonAvatar name={entry.avatarName} photoUrl={entry.avatarUrl} />}
      title={entry.title}
      titleMeta={entry.context}
      preview={preview}
      time={entry.lastAt}
      unread={entry.unread}
      onClick={() => void state.openDirect(card)}
    />
  );
}

function DirectThreadDialog({ state }: { state: State }) {
  const onClose = () => {
    state.setOpen(null);
    void state.reload();
  };
  return (
    <Dialog fullScreen open={Boolean(state.open)} onClose={onClose} dir="rtl" PaperProps={{ sx: fullscreenChatDialogPaperSx }}>
      <FullscreenBackAppBar title={state.open?.title ?? ""} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        {state.open && <DirectChatThread conversationId={state.open.id} onSent={() => void state.reload()} />}
      </Box>
    </Dialog>
  );
}

function TaskThreadDialog({ state }: { state: State }) {
  const task = state.task;
  const onClose = () => {
    state.setTask(null);
    void state.reload();
  };
  return (
    <TaskChatDialog
      open={Boolean(task)}
      occurrenceId={task?.occurrenceId ?? ""}
      title={task?.title ?? he.taskChatTitle}
      status={task?.status}
      employee={false}
      onClose={onClose}
      onOccurrenceUpdated={() => void state.reload()}
    />
  );
}

function BroadcastDialog({ state }: { state: State }) {
  const { showSuccess } = useFeedback();
  const onClose = () => state.setBroadcastOpen(false);
  return (
    <Dialog fullScreen open={state.broadcastOpen} onClose={onClose} dir="rtl" PaperProps={{ sx: fullscreenChatDialogPaperSx }}>
      <FullscreenBackAppBar title={he.directChatBroadcast} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        <DirectChatThread
          conversationId={null}
          broadcast
          onSent={() => {
            showSuccess(he.directChatBroadcastSent(state.entries.filter((e) => e.kind === "direct").length));
            state.setBroadcastOpen(false);
            void state.reload();
          }}
        />
      </Box>
    </Dialog>
  );
}
