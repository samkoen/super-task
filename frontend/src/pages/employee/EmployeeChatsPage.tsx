import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Dialog,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import { ApiError } from "../../services/api";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import DirectChatThread from "../../components/chat/DirectChatThread";
import FullscreenBackAppBar, {
  fullscreenChatBodySx,
  fullscreenChatDialogPaperSx,
} from "../../components/chat/FullscreenBackAppBar";
import TaskChatPanel from "../../components/tasks/TaskChatPanel";
import { directChatService, type DirectChatCard } from "../../services/directChatService";
import { taskService, type EmployeeTaskChat, type TaskStatus } from "../../services/taskService";
import { formatTime } from "../../utils/dashboardTime";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import {
  employeeManagerLabel,
  employeeOpenMineScope,
  employeeSurfaceChatState,
  needsEmployeeManagerPicker,
} from "../../utils/employeeDirectChat";
import {
  buildEmployeeChatRows,
  generalChatSummary,
  type EmployeeChatRow,
} from "../../utils/employeeTaskChats";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { useAuth } from "../../context/AuthContext";

export default function EmployeeChatsPage() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const [managers, setManagers] = useState<DirectChatCard[]>([]);
  const [tasks, setTasks] = useState<EmployeeTaskChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [generalId, setGeneralId] = useState<string | null>(null);
  const [generalTitle, setGeneralTitle] = useState(he.employeeGeneralChat);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [taskChat, setTaskChat] = useState<EmployeeTaskChat | null>(null);

  const load = useCallback(async () => {
    try {
      const [inbox, chats] = await Promise.all([
        directChatService.inbox(),
        taskService.listEmployeeChats(),
      ]);
      setManagers(employeeSurfaceChatState(inbox, user?.role).managers);
      setTasks(chats.items);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [showError, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);
  useDirectChatLiveSync(null, () => void load());
  useTaskChangeListener(() => void load());

  const rows = useMemo(
    () => buildEmployeeChatRows(generalChatSummary(managers), tasks),
    [managers, tasks],
  );

  const openGeneral = async (scope?: "branch" | "network", title = he.employeeGeneralChat) => {
    try {
      const opened = await directChatService.openMine(scope);
      setGeneralId(opened.conversation.id);
      setGeneralTitle(title);
      setPickerOpen(false);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const onGeneral = async () => {
    if (needsEmployeeManagerPicker(managers)) {
      setPickerOpen(true);
      return;
    }
    const only = managers[0];
    await openGeneral(
      employeeOpenMineScope(managers),
      only ? employeeManagerLabel(only) : he.employeeGeneralChat,
    );
  };

  const onRow = (row: EmployeeChatRow) => {
    if (row.kind === "general") {
      void onGeneral();
      return;
    }
    setTaskChat(tasks.find((item) => item.id === row.id) ?? null);
  };

  return (
    <Box>
      <PageHeader title={he.directChatTitle} />
      {loading ? (
        <ListSkeleton />
      ) : (
        <ChatRows rows={rows} onRow={onRow} />
      )}

      <Dialog
        fullScreen
        open={Boolean(generalId)}
        onClose={() => {
          setGeneralId(null);
          void load();
        }}
        dir="rtl"
        PaperProps={{ sx: fullscreenChatDialogPaperSx }}
      >
        <FullscreenBackAppBar
          title={generalTitle}
          onBack={() => {
            setGeneralId(null);
            void load();
          }}
        />
        <Box sx={fullscreenChatBodySx}>
          {generalId && <DirectChatThread conversationId={generalId} onSent={() => void load()} />}
        </Box>
      </Dialog>

      <Dialog
        fullScreen
        open={Boolean(taskChat)}
        onClose={() => {
          setTaskChat(null);
          void load();
        }}
        dir="rtl"
        PaperProps={{ sx: fullscreenChatDialogPaperSx }}
      >
        <FullscreenBackAppBar
          title={taskChat?.title ?? he.taskChatTitle}
          onBack={() => {
            setTaskChat(null);
            void load();
          }}
        />
        <Box sx={fullscreenChatBodySx}>
          {taskChat && (
            <TaskChatPanel
              occurrenceId={taskChat.id}
              occurrenceStatus={taskChat.status as TaskStatus}
              composeEnabled={canComposeTaskChat(taskChat.status, true)}
              onOccurrenceUpdated={() => void load()}
            />
          )}
        </Box>
      </Dialog>

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <List>
          {managers.map((card) => (
            <ListItemButton
              key={`${card.scope}-${card.counterpart_user_id}`}
              onClick={() =>
                void openGeneral(
                  card.scope === "network" ? "network" : "branch",
                  employeeManagerLabel(card),
                )
              }
            >
              <ListItemText
                primary={employeeManagerLabel(card)}
                secondary={card.unread_count ? String(card.unread_count) : undefined}
              />
            </ListItemButton>
          ))}
        </List>
      </Dialog>
    </Box>
  );
}

function ChatRows({
  rows,
  onRow,
}: {
  rows: EmployeeChatRow[];
  onRow: (row: EmployeeChatRow) => void;
}) {
  if (!rows.length) {
    return <EmptyState title={he.directChatEmpty} icon={<ChatOutlinedIcon fontSize="inherit" />} />;
  }
  return (
    <List disablePadding>
      {rows.map((row) => (
        <ListItemButton
          key={row.kind === "general" ? "general" : row.id}
          onClick={() => onRow(row)}
          sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1.25 }}
        >
          <ListItemText
            primary={row.title}
            secondary={row.last_preview || he.directChatEmpty}
            primaryTypographyProps={{
              fontWeight: row.kind === "general" && row.unread_count ? 800 : 600,
            }}
            secondaryTypographyProps={{ noWrap: true }}
          />
          <Box textAlign="left" minWidth={56}>
            {row.last_at && (
              <Typography variant="caption" color="text.secondary" display="block">
                {formatTime(row.last_at)}
              </Typography>
            )}
            {row.kind === "general" && row.unread_count > 0 && (
              <Badge badgeContent={row.unread_count} color="error" sx={{ mt: 0.5 }} />
            )}
          </Box>
        </ListItemButton>
      ))}
    </List>
  );
}
