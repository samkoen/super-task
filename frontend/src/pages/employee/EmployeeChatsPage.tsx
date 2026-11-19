import { useMemo, useState } from "react";
import { Box, Dialog, Menu, MenuItem } from "@mui/material";
import ManagerPickerDialog from "../../components/chat/ManagerPickerDialog";
import { he } from "../../i18n/he";
import DirectChatThread from "../../components/chat/DirectChatThread";
import FullscreenBackAppBar, {
  fullscreenChatBodySx,
  fullscreenChatDialogPaperSx,
} from "../../components/chat/FullscreenBackAppBar";
import TaskChatDialog from "../../components/tasks/TaskChatDialog";
import NewChatSheet from "../../components/chat/employeeInbox/NewChatSheet";
import { ChatsArchiveView, ChatsHomeView } from "../../components/chat/employeeInbox/EmployeeChatsViews";
import type { EmployeeTaskChat, TaskStatus } from "../../services/taskService";
import { useEmployeeChats } from "../../hooks/useEmployeeChats";
import { useEmployeeGeneralChat } from "../../hooks/useEmployeeGeneralChat";
import {
  buildEmployeeChatRows,
  generalChatIdentity,
  generalChatSummary,
  type EmployeeChatRow,
} from "../../utils/employeeTaskChats";
import { chatUi } from "../../styles/employeeChatUi";

type OpenTaskChat = { id: string; title: string; status?: TaskStatus };

/** Bleed plein écran : le <main> employé a un padding, la maquette va bord à bord. */
const bleedSx = { mx: { xs: -1.5, sm: -2.5 }, mt: { xs: -2, sm: -2.5 }, pb: 12 } as const;

/** Écran Figma « 01 · רשימת הצ׳אטים – עובד » + Sheet « 02 · צ׳אט חדש ». */
export default function EmployeeChatsPage() {
  const chats = useEmployeeChats();
  const identity = useMemo(() => generalChatIdentity(chats.managers), [chats.managers]);
  const general = useEmployeeGeneralChat(chats.managers, identity.title);
  const [showArchive, setShowArchive] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [taskChat, setTaskChat] = useState<OpenTaskChat | null>(null);

  const rows = useMemo(
    () => buildEmployeeChatRows({ ...generalChatSummary(chats.managers), ...identity }, chats.tasks),
    [chats.managers, chats.tasks, identity],
  );

  const onRow = (row: EmployeeChatRow, source: EmployeeTaskChat[]) => {
    if (row.kind === "general") {
      void general.start();
      return;
    }
    setTaskChat({ id: row.id, title: row.title, status: source.find((t) => t.id === row.id)?.status });
  };

  const openArchive = () => {
    setMenuAnchor(null);
    setShowArchive(true);
    void chats.loadArchive();
  };

  const closeTaskChat = () => {
    setTaskChat(null);
    void chats.reload();
    if (showArchive) void chats.loadArchive();
  };

  return (
    <Box sx={{ ...bleedSx, fontFamily: chatUi.font }} dir="rtl">
      {showArchive ? (
        <ChatsArchiveView
          archive={chats.archive}
          onBack={() => setShowArchive(false)}
          onRow={(row) => onRow(row, chats.archive ?? [])}
        />
      ) : (
        <ChatsHomeView
          rows={rows}
          loading={chats.loading}
          archivedCount={chats.archivedCount}
          onArchive={openArchive}
          onMenu={setMenuAnchor}
          onNewChat={() => setSheetOpen(true)}
          onRow={(row) => onRow(row, chats.tasks)}
        />
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={openArchive}>{he.employeeChatsArchive}</MenuItem>
      </Menu>

      <NewChatSheet
        open={sheetOpen}
        managerName={chats.managers.length === 1 ? chats.managers[0].counterpart_name : null}
        managerInitials={identity.initials}
        tasks={chats.startable}
        onClose={() => setSheetOpen(false)}
        onGeneral={() => {
          setSheetOpen(false);
          void general.start();
        }}
        onTask={(task) => {
          setSheetOpen(false);
          setTaskChat({ id: task.id, title: task.title, status: task.status });
        }}
      />

      <GeneralChatDialog
        conversationId={general.conversationId}
        title={general.title}
        onClose={() => {
          general.close();
          void chats.reload();
        }}
        onSent={() => void chats.reload()}
      />

      <TaskChatDialog
        open={Boolean(taskChat)}
        occurrenceId={taskChat?.id ?? ""}
        title={taskChat?.title ?? he.taskChatTitle}
        status={taskChat?.status}
        employee
        onClose={closeTaskChat}
        onOccurrenceUpdated={() => void chats.reload()}
      />

      <ManagerPickerDialog
        open={general.pickerOpen}
        managers={chats.managers}
        onClose={general.closePicker}
        onPick={(card) => void general.pick(card)}
      />
    </Box>
  );
}

function GeneralChatDialog({
  conversationId,
  title,
  onClose,
  onSent,
}: {
  conversationId: string | null;
  title: string;
  onClose: () => void;
  onSent: () => void;
}) {
  return (
    <Dialog fullScreen open={Boolean(conversationId)} onClose={onClose} dir="rtl" PaperProps={{ sx: fullscreenChatDialogPaperSx }}>
      <FullscreenBackAppBar title={title} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        {conversationId && <DirectChatThread conversationId={conversationId} onSent={onSent} />}
      </Box>
    </Dialog>
  );
}
