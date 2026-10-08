import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Dialog, List } from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import EmployeeChatRowItem from "../../components/chat/EmployeeChatRowItem";
import ManagerPickerDialog from "../../components/chat/ManagerPickerDialog";
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
import TaskChatDialog from "../../components/tasks/TaskChatDialog";
import { directChatService, type DirectChatCard } from "../../services/directChatService";
import { taskService, type EmployeeTaskChat } from "../../services/taskService";
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
  taskChatListTitle,
  type EmployeeChatRow,
} from "../../utils/employeeTaskChats";
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

      <TaskChatDialog
        open={Boolean(taskChat)}
        occurrenceId={taskChat?.id ?? ""}
        title={taskChat ? taskChatListTitle(taskChat.title, taskChat.due_at || taskChat.last_at) : he.taskChatTitle}
        status={taskChat?.status}
        employee
        onClose={() => {
          setTaskChat(null);
          void load();
        }}
        onOccurrenceUpdated={() => void load()}
      />

      <ManagerPickerDialog
        open={pickerOpen}
        managers={managers}
        onClose={() => setPickerOpen(false)}
        onPick={(card) =>
          void openGeneral(card.scope === "network" ? "network" : "branch", employeeManagerLabel(card))
        }
      />
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
    <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {rows.map((row) => (
        <EmployeeChatRowItem key={row.kind === "general" ? "general" : row.id} row={row} onRow={onRow} />
      ))}
    </List>
  );
}
