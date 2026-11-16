import { useCallback, useMemo, useRef, useState } from "react";
import { Box, ButtonBase, Chip, Dialog, InputAdornment, List, ListItemAvatar, TextField } from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { ChatRowAvatar } from "../../components/chat/EmployeeChatRowItem";
import { employeeFieldSx } from "../../styles/employeeUi";
import { studioPillSx } from "../../components/tasks/fixed/studio/studioUi";
import { useFeedback } from "../../context/FeedbackContext";
import { useManagerPageHeader } from "../../context/ManagerPageHeaderContext";
import { he } from "../../i18n/he";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import EmployeeAvatar from "../../components/employee/EmployeeAvatar";
import DirectChatThread from "../../components/chat/DirectChatThread";
import ChatInboxRow from "../../components/chat/ChatInboxRow";
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

const FILTERS: { id: ManagerChatsFilter; label: string }[] = [
  { id: "all", label: he.managerChatsFilterAll },
  { id: "tasks", label: he.managerChatsFilterTasks },
  { id: "directs", label: he.managerChatsFilterDirects },
];

const chatListSx = { display: "flex", flexDirection: "column", gap: 1.25 } as const;

/**
 * Onglet שיחות unifié (étape 7) : une seule boîte dans le style de l'écran 12 du Figma. Les chats
 * directs et les fils de tâche sont mélangés, « ממתין לי » en tête, filtrables par pastille.
 * « שליחה לכולם » devient un rond dans l'en-tête de la coque.
 */
export default function ManagerDirectChatsPage() {
  const state = useUnifiedChatsState();
  useManagerPageHeader(he.directChatTitle, undefined, state.broadcastAction);

  return (
    <Box>
      <ChatsFilterPills active={state.filter} onSelect={state.setFilter} />
      <TextField
        fullWidth
        value={state.query}
        onChange={(e) => state.setQuery(e.target.value)}
        placeholder={he.directChatSearch}
        sx={{ ...employeeFieldSx, mb: 2 }}
        inputProps={{ "aria-label": he.directChatSearch }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
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
  return {
    ...chats, filter, setFilter, query, setQuery, open, setOpen, task, setTask,
    broadcastOpen, setBroadcastOpen, openDirect, broadcastAction, visible,
  };
}

type State = ReturnType<typeof useUnifiedChatsState>;

function ChatsFilterPills({ active, onSelect }: { active: ManagerChatsFilter; onSelect: (f: ManagerChatsFilter) => void }) {
  return (
    <Box role="tablist" aria-label={he.managerChatsFilterLabel} sx={{ display: "flex", gap: "8px", mb: 2, flexWrap: "wrap" }}>
      {FILTERS.map(({ id, label }) => (
        <ButtonBase
          key={id}
          role="tab"
          aria-selected={active === id}
          data-testid={`manager-chats-filter-${id}`}
          onClick={() => onSelect(id)}
          sx={studioPillSx(active === id)}
        >
          {label}
        </ButtonBase>
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
    <List disablePadding sx={chatListSx}>
      {state.visible.map((entry) => (
        <InboxRowItem key={entry.key} entry={entry} state={state} />
      ))}
    </List>
  );
}

function InboxRowItem({ entry, state }: { entry: ManagerInboxEntry; state: State }) {
  if (entry.kind === "task" && entry.task) {
    const task = entry.task;
    return (
      <ChatInboxRow
        title={entry.title}
        preview={entry.preview || he.chatRowEmpty}
        lastAt={entry.lastAt}
        unreadCount={entry.unread}
        onClick={() => state.setTask(task)}
        leading={<ChatRowAvatar general={false} />}
        titleExtra={
          <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
            <Chip label={he.managerChatTaskContext} size="small" color="warning" sx={{ fontWeight: 700 }} />
            {entry.context ? <Chip label={entry.context} size="small" sx={{ fontWeight: 700 }} /> : null}
          </Box>
        }
      />
    );
  }
  const card = entry.direct!;
  return (
    <ChatInboxRow
      title={entry.title}
      preview={entry.preview || he.chatRowEmpty}
      lastAt={entry.lastAt}
      unreadCount={entry.unread}
      onClick={() => void state.openDirect(card)}
      leading={
        <ListItemAvatar>
          <EmployeeAvatar name={card.counterpart_name} photoUrl={card.counterpart_avatar_url} size={56} />
        </ListItemAvatar>
      }
      titleExtra={entry.context ? <Chip label={entry.context} sx={{ fontWeight: 700, fontSize: "0.9rem" }} /> : null}
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
