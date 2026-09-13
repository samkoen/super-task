import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Dialog, List, ListItemAvatar, TextField } from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import { ApiError } from "../../services/api";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import EmployeeAvatar from "../../components/employee/EmployeeAvatar";
import DirectChatThread from "../../components/chat/DirectChatThread";
import ChatInboxRow from "../../components/chat/ChatInboxRow";
import FullscreenBackAppBar, {
  fullscreenChatBodySx,
  fullscreenChatDialogPaperSx,
} from "../../components/chat/FullscreenBackAppBar";
import TaskChatPanel from "../../components/tasks/TaskChatPanel";
import { directChatService, type DirectChatCard } from "../../services/directChatService";
import { taskService, type ManagerDayTaskChat } from "../../services/taskService";
import { directChatTitle, sortDirectChatCards } from "../../utils/directChat";
import {
  buildManagerEmployeeRows,
  filterManagerContacts,
  type ManagerEmployeeRow,
} from "../../utils/managerChatInbox";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";

async function fetchDirectThread(card: DirectChatCard) {
  const opened = card.kind === "up"
    ? await directChatService.openMine()
    : await directChatService.openWith(card.counterpart_user_id);
  return {
    id: opened.conversation.id,
    title: card.kind === "up" ? directChatTitle(card) : he.employeeGeneralChat,
  };
}

export default function ManagerDirectChatsPage() {
  const { showError, showSuccess } = useFeedback();
  const state = useManagerChatsState(showError);

  return (
    <Box>
      <PageHeader
        title={he.directChatTitle}
        action={
          <Button
            variant="outlined"
            startIcon={<CampaignOutlinedIcon />}
            onClick={() => state.setBroadcastOpen(true)}
            disabled={state.items.length === 0}
          >
            {he.directChatBroadcast}
          </Button>
        }
      />
      <TextField
        fullWidth
        size="small"
        value={state.query}
        onChange={(e) => state.setQuery(e.target.value)}
        placeholder={he.directChatSearch}
        sx={{ mb: 1.5 }}
        inputProps={{ "aria-label": he.directChatSearch }}
      />
      <ContactsBody state={state} />
      <EmployeeChatsDialog state={state} />
      <DirectThreadDialog state={state} />
      <TaskThreadDialog state={state} />
      <BroadcastDialog
        open={state.broadcastOpen}
        count={state.items.length}
        onClose={() => state.setBroadcastOpen(false)}
        onSent={() => {
          showSuccess(he.directChatBroadcastSent(state.items.length));
          state.setBroadcastOpen(false);
          void state.load();
        }}
      />
    </Box>
  );
}

function useManagerChatsState(showError: (msg: string) => void) {
  const [items, setItems] = useState<DirectChatCard[]>([]);
  const [up, setUp] = useState<DirectChatCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DirectChatCard | null>(null);
  const [dayTasks, setDayTasks] = useState<ManagerDayTaskChat[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTitle, setOpenTitle] = useState("");
  const [taskChat, setTaskChat] = useState<ManagerDayTaskChat | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await directChatService.inbox();
      const next = sortDirectChatCards(data.items);
      setItems(next);
      setUp(data.up);
      setSelected((prev) => (prev ? next.find((c) => c.counterpart_user_id === prev.counterpart_user_id) ?? prev : null));
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadDayTasks = useCallback(async (employeeId: string) => {
    try {
      const data = await taskService.listManagerDayChats(employeeId);
      setDayTasks(data.items);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);
  useDirectChatLiveSync(null, () => void load());
  useTaskChangeListener(() => {
    void load();
    if (selected) void loadDayTasks(selected.counterpart_user_id);
  });

  const openDirect = async (card: DirectChatCard) => {
    try {
      const opened = await fetchDirectThread(card);
      setOpenId(opened.id);
      setOpenTitle(opened.title);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const onContact = async (card: DirectChatCard) => {
    if (card.kind === "up") {
      await openDirect(card);
      return;
    }
    setSelected(card);
    await loadDayTasks(card.counterpart_user_id);
  };

  const rows = up ? [up, ...items] : items;
  const visible = useMemo(() => filterManagerContacts(rows, query), [rows, query]);
  return {
    items, up, loading, query, setQuery, selected, setSelected, dayTasks, setDayTasks,
    openId, setOpenId, openTitle, taskChat, setTaskChat, broadcastOpen, setBroadcastOpen,
    load, loadDayTasks, openDirect, onContact, visible, rows,
  };
}

function ContactsBody({ state }: { state: ReturnType<typeof useManagerChatsState> }) {
  if (state.loading) return <ListSkeleton />;
  if (state.visible.length === 0) {
    return (
      <EmptyState
        title={state.rows.length ? he.directChatNoSearchResults : he.directChatNoPeers}
        icon={<ChatOutlinedIcon fontSize="inherit" />}
      />
    );
  }
  return (
    <List disablePadding>
      {state.visible.map((card) => (
        <ChatInboxRow
          key={`${card.kind}-${card.counterpart_user_id}`}
          title={directChatTitle(card)}
          preview={card.last_preview || he.directChatEmpty}
          lastAt={card.last_at}
          unreadCount={card.unread_count}
          onClick={() => void state.onContact(card)}
          leading={
            <ListItemAvatar>
              <EmployeeAvatar name={card.counterpart_name} photoUrl={card.counterpart_avatar_url} size={44} />
            </ListItemAvatar>
          }
          titleExtra={
            card.kind === "down" && card.branch_name ? <Chip size="small" label={card.branch_name} /> : null
          }
        />
      ))}
    </List>
  );
}

function EmployeeChatsDialog({ state }: { state: ReturnType<typeof useManagerChatsState> }) {
  const rows = state.selected ? buildManagerEmployeeRows(state.selected, state.dayTasks) : [];
  const onBack = () => {
    state.setSelected(null);
    state.setDayTasks([]);
    void state.load();
  };
  return (
    <Dialog
      fullScreen
      open={Boolean(state.selected)}
      onClose={onBack}
      dir="rtl"
      PaperProps={{ sx: fullscreenChatDialogPaperSx }}
    >
      <FullscreenBackAppBar title={state.selected?.counterpart_name ?? ""} onBack={onBack} />
      <Box sx={fullscreenChatBodySx}>
        <List disablePadding>
          {rows.map((row) => (
            <EmployeeRow
              key={row.kind === "general" ? "general" : row.id}
              row={row}
              onGeneral={() => state.selected && void state.openDirect(state.selected)}
              onTask={state.setTaskChat}
            />
          ))}
        </List>
      </Box>
    </Dialog>
  );
}

function EmployeeRow({
  row,
  onGeneral,
  onTask,
}: {
  row: ManagerEmployeeRow;
  onGeneral: () => void;
  onTask: (task: ManagerDayTaskChat) => void;
}) {
  const onClick = () => {
    if (row.kind === "general") {
      onGeneral();
      return;
    }
    onTask({
      id: row.id,
      title: row.title,
      status: row.status,
      last_preview: row.last_preview,
      last_at: row.last_at,
      unread_count: row.unread_count,
    });
  };
  return (
    <ChatInboxRow
      title={row.title}
      preview={row.last_preview || he.directChatEmpty}
      lastAt={row.last_at}
      unreadCount={row.unread_count}
      onClick={onClick}
    />
  );
}

function DirectThreadDialog({ state }: { state: ReturnType<typeof useManagerChatsState> }) {
  const onClose = () => {
    state.setOpenId(null);
    void state.load();
    if (state.selected) void state.loadDayTasks(state.selected.counterpart_user_id);
  };
  return (
    <Dialog
      fullScreen
      open={Boolean(state.openId)}
      onClose={onClose}
      dir="rtl"
      PaperProps={{ sx: fullscreenChatDialogPaperSx }}
    >
      <FullscreenBackAppBar title={state.openTitle} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        {state.openId && <DirectChatThread conversationId={state.openId} onSent={() => void state.load()} />}
      </Box>
    </Dialog>
  );
}

function TaskThreadDialog({ state }: { state: ReturnType<typeof useManagerChatsState> }) {
  const onClose = () => {
    state.setTaskChat(null);
    void state.load();
    if (state.selected) void state.loadDayTasks(state.selected.counterpart_user_id);
  };
  return (
    <Dialog
      fullScreen
      open={Boolean(state.taskChat)}
      onClose={onClose}
      dir="rtl"
      PaperProps={{ sx: fullscreenChatDialogPaperSx }}
    >
      <FullscreenBackAppBar title={state.taskChat?.title ?? he.taskChatTitle} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        {state.taskChat && (
          <TaskChatPanel
            occurrenceId={state.taskChat.id}
            occurrenceStatus={state.taskChat.status}
            composeEnabled={canComposeTaskChat(state.taskChat.status, false)}
            onOccurrenceUpdated={() => {
              void state.load();
              if (state.selected) void state.loadDayTasks(state.selected.counterpart_user_id);
            }}
          />
        )}
      </Box>
    </Dialog>
  );
}

function BroadcastDialog({
  open,
  count: _count,
  onClose,
  onSent,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onSent: () => void;
}) {
  return (
    <Dialog fullScreen open={open} onClose={onClose} dir="rtl" PaperProps={{ sx: fullscreenChatDialogPaperSx }}>
      <FullscreenBackAppBar title={he.directChatBroadcast} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        <DirectChatThread conversationId={null} broadcast onSent={onSent} />
      </Box>
    </Dialog>
  );
}
