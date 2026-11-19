import { useMemo, useState } from "react";
import { Box, Fab, IconButton } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { he } from "../../../i18n/he";
import EmptyState from "../../ui/EmptyState";
import ListSkeleton from "../../ui/ListSkeleton";
import type { EmployeeTaskChat } from "../../../services/taskService";
import { chatUi } from "../../../styles/employeeChatUi";
import { EMPLOYEE_BOTTOM_NAV_HEIGHT_PX } from "../../../utils/employeeBottomNav";
import { withSystemBottomInsetCss } from "../../../utils/systemInsets";
import {
  buildEmployeeChatRows,
  chatNeedsAction,
  filterEmployeeChatRows,
  generalChatSummary,
  type EmployeeChatFilter,
  type EmployeeChatRow,
} from "../../../utils/employeeTaskChats";
import ChatListRow from "./ChatListRow";
import { ChatGeneralAvatar, ChatTaskAvatar } from "./ChatAvatars";
import { ChatArchiveRow, ChatFilterChip, ChatSearchField } from "./ChatListControls";

/** Ordre RTL Figma : הכל à droite … אושרו à gauche. */
const FILTERS: { id: EmployeeChatFilter; label: string }[] = [
  { id: "all", label: he.employeeChatsFilterAll },
  { id: "action", label: he.employeeChatsFilterAction },
  { id: "pending", label: he.employeeChatsFilterPending },
  { id: "approved", label: he.employeeChatsFilterApproved },
];

const titleSx = { m: 0, fontSize: 24, fontWeight: 700, color: chatUi.textPrimary } as const;

/** Liste principale : App Bar, recherche, filtres, ligne archive, chats, FAB « צ׳אט חדש ». */
export function ChatsHomeView({
  rows,
  loading,
  archivedCount,
  onArchive,
  onMenu,
  onNewChat,
  onRow,
}: {
  rows: EmployeeChatRow[];
  loading: boolean;
  archivedCount: number;
  onArchive: () => void;
  onMenu: (el: HTMLElement) => void;
  onNewChat: () => void;
  onRow: (row: EmployeeChatRow) => void;
}) {
  const [filter, setFilter] = useState<EmployeeChatFilter>("all");
  const [query, setQuery] = useState("");
  const actionCount = useMemo(() => rows.filter(chatNeedsAction).length, [rows]);
  const visible = useMemo(() => filterEmployeeChatRows(rows, filter, query), [rows, filter, query]);
  return (
    <>
      <Box sx={{ pr: 3, pl: 0.5, pt: 0.5, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box component="h1" sx={titleSx}>
          {he.employeeChatsTitle}
        </Box>
        <IconButton aria-label={he.employeeChatsMenu} onClick={(e) => onMenu(e.currentTarget)} sx={{ width: 48, height: 48 }}>
          <MoreVertIcon sx={{ color: chatUi.textPrimary }} />
        </IconButton>
      </Box>
      <Box sx={{ px: 3, pb: 1.5 }}>
        <ChatSearchField value={query} onChange={setQuery} placeholder={he.employeeChatsSearch} />
      </Box>
      <ChatFilters active={filter} actionCount={actionCount} onChange={setFilter} />
      {archivedCount > 0 ? (
        <ChatArchiveRow label={he.employeeChatsArchive} count={archivedCount} onClick={onArchive} />
      ) : (
        <Box sx={{ height: 12 }} />
      )}
      {loading ? (
        <Box sx={{ px: 2 }}>
          <ListSkeleton />
        </Box>
      ) : (
        <ChatRows rows={visible} filtered={filter !== "all" || Boolean(query.trim())} onRow={onRow} />
      )}
      <NewChatFab onClick={onNewChat} />
    </>
  );
}

function ChatFilters({
  active,
  actionCount,
  onChange,
}: {
  active: EmployeeChatFilter;
  actionCount: number;
  onChange: (next: EmployeeChatFilter) => void;
}) {
  return (
    <Box sx={{ px: 3, pt: 1, display: "flex", gap: 1, overflowX: "auto", scrollbarWidth: "none" }}>
      {FILTERS.map((item) => (
        <ChatFilterChip
          key={item.id}
          label={item.label}
          active={active === item.id}
          count={item.id === "action" ? actionCount : 0}
          onClick={() => onChange(item.id)}
        />
      ))}
    </Box>
  );
}

/** FAB 56×56 : 24 du bord, 16 au-dessus du Bottom Nav. */
function NewChatFab({ onClick }: { onClick: () => void }) {
  return (
    <Fab
      aria-label={he.employeeNewChat}
      onClick={onClick}
      sx={{
        position: "fixed",
        left: 24,
        bottom: withSystemBottomInsetCss(`${EMPLOYEE_BOTTOM_NAV_HEIGHT_PX + 16}px`),
        width: chatUi.fab,
        height: chatUi.fab,
        borderRadius: `${chatUi.fabRadius}px`,
        bgcolor: chatUi.accent,
        color: "#fff",
        boxShadow: "0px 6px 18px rgba(247,112,30,0.35)",
        "&:hover": { bgcolor: "#e2621a" },
      }}
    >
      <AddCommentOutlinedIcon />
    </Fab>
  );
}

/** Archive : chats fermés des משמרות précédentes. */
export function ChatsArchiveView({
  archive,
  onBack,
  onRow,
}: {
  archive: EmployeeTaskChat[] | null;
  onBack: () => void;
  onRow: (row: EmployeeChatRow) => void;
}) {
  const rows = useMemo(
    () => (archive ? buildEmployeeChatRows(generalChatSummary([]), archive).slice(1) : []),
    [archive],
  );
  return (
    <>
      <Box sx={{ pr: 1, pl: 3, pt: 0.5, pb: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton aria-label={he.goBack} onClick={onBack} sx={{ width: 48, height: 48 }}>
          <ArrowForwardIcon sx={{ color: chatUi.textPrimary }} />
        </IconButton>
        <Box component="h1" sx={titleSx}>
          {he.employeeChatsArchive}
        </Box>
      </Box>
      {archive === null ? (
        <Box sx={{ px: 2 }}>
          <ListSkeleton />
        </Box>
      ) : rows.length ? (
        <ChatRows rows={rows} filtered onRow={onRow} />
      ) : (
        <EmptyState title={he.employeeChatsArchiveEmpty} icon={<ChatOutlinedIcon fontSize="inherit" />} />
      )}
    </>
  );
}

function ChatRows({
  rows,
  filtered,
  onRow,
}: {
  rows: EmployeeChatRow[];
  filtered: boolean;
  onRow: (row: EmployeeChatRow) => void;
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title={filtered ? he.employeeChatsFilterEmpty : he.directChatEmpty}
        icon={<ChatOutlinedIcon fontSize="inherit" />}
      />
    );
  }
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, px: 1, py: 0 }}>
      {rows.map((row) => (
        <Box component="li" key={row.kind === "general" ? "general" : row.id}>
          <EmployeeChatRowView row={row} onRow={onRow} />
        </Box>
      ))}
    </Box>
  );
}

function EmployeeChatRowView({ row, onRow }: { row: EmployeeChatRow; onRow: (row: EmployeeChatRow) => void }) {
  const common = {
    title: row.title,
    preview: row.last_preview || he.chatRowEmpty,
    time: row.last_at,
    unread: row.unread_count,
    onClick: () => onRow(row),
  };
  if (row.kind === "general") {
    return <ChatListRow {...common} testId="chat-row-general" avatar={<ChatGeneralAvatar initials={row.initials} />} pinned />;
  }
  return (
    <ChatListRow
      {...common}
      testId={`chat-row-${row.id}`}
      avatar={<ChatTaskAvatar kind={row.visual_kind} />}
      status={row.chat_status}
      lastMine={row.last_mine}
    />
  );
}
