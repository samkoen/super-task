import { useMemo, useState } from "react";
import { Box, IconButton, SwipeableDrawer } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { he } from "../../../i18n/he";
import type { EmployeeStartableChat } from "../../../services/taskService";
import { chatUi } from "../../../styles/employeeChatUi";
import { formatTime } from "../../../utils/dashboardTime";
import { matchesChatSearch } from "../../../utils/employeeTaskChats";
import ChatListRow from "./ChatListRow";
import { ChatGeneralAvatar, ChatTaskAvatar } from "./ChatAvatars";
import { ChatSearchField } from "./ChatListControls";

/**
 * Bottom Sheet « צ׳אט חדש » (Figma 02) : question générale à la menahelet, ou chat sur
 * une תת-משימה de la משמרת qui n'a pas encore de conversation (évite les doublons).
 * Fermeture : X, glisser vers le bas ou toucher le fond.
 */
export default function NewChatSheet({
  open,
  managerName,
  managerInitials,
  tasks,
  onClose,
  onGeneral,
  onTask,
}: {
  open: boolean;
  managerName: string | null;
  managerInitials: string;
  tasks: EmployeeStartableChat[];
  onClose: () => void;
  onGeneral: () => void;
  onTask: (task: EmployeeStartableChat) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => tasks.filter((task) => matchesChatSearch({ title: task.title, last_preview: null }, query)),
    [tasks, query],
  );
  const generalTitle = managerName ? he.employeeNewChatGeneralWith(managerName) : he.employeeNewChatGeneral;

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onOpen={() => undefined}
      onClose={onClose}
      disableSwipeToOpen
      SlideProps={{ onExited: () => setQuery("") }}
      PaperProps={{
        dir: "rtl",
        "aria-label": he.employeeNewChat,
        sx: {
          borderRadius: "24px 24px 0 0",
          maxHeight: "85vh",
          maxWidth: 560,
          mx: "auto",
          pb: 4,
          fontFamily: chatUi.font,
        },
      }}
    >
      <SheetHeader onClose={onClose} />
      <Box sx={{ px: 2, pt: 0.5, pb: 1 }}>
        <ChatSearchField value={query} onChange={setQuery} placeholder={he.employeeNewChatSearch} />
      </Box>
      <Box sx={{ overflowY: "auto" }}>
        <ChatListRow
          testId="new-chat-general"
          avatar={<ChatGeneralAvatar initials={managerInitials} />}
          title={generalTitle}
          preview={he.employeeNewChatGeneralHint}
          onClick={onGeneral}
        />
        <Box
          component="p"
          sx={{ m: 0, px: 2, pt: 1.5, pb: 0.5, fontSize: 12, fontWeight: 500, color: chatUi.textSecondary }}
        >
          {tasks.length ? he.employeeNewChatTasksLabel : he.employeeNewChatNoTasks}
        </Box>
        {visible.map((task) => (
          <ChatListRow
            key={task.id}
            testId={`new-chat-task-${task.id}`}
            avatar={<ChatTaskAvatar kind={task.visual_kind ?? "physical"} />}
            title={task.title}
            preview={task.due_at ? he.employeeNewChatAt(formatTime(task.due_at)) : ""}
            onClick={() => onTask(task)}
          />
        ))}
      </Box>
    </SwipeableDrawer>
  );
}

/** Sheet Header Figma : poignée, titre H2 et bouton X (48dp). */
function SheetHeader({ onClose }: { onClose: () => void }) {
  return (
    <Box sx={{ pt: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Box sx={{ width: 40, height: 4, borderRadius: "2px", bgcolor: chatUi.handle }} />
      <Box sx={{ width: "100%", pt: 1, pr: 2, pl: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box component="h2" sx={{ m: 0, fontSize: 20, fontWeight: 700, color: chatUi.textPrimary }}>
          {he.employeeNewChat}
        </Box>
        <IconButton onClick={onClose} aria-label={he.close} sx={{ width: 48, height: 48 }}>
          <CloseRoundedIcon sx={{ color: chatUi.textPrimary }} />
        </IconButton>
      </Box>
    </Box>
  );
}
