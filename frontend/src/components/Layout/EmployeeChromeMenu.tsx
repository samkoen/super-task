import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import { Badge, Chip, IconButton, Menu, MenuItem, alpha } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { he } from "../../i18n/he";
import { employeeChromeMenuFlags } from "../../utils/employeeChromeMenu";
import ViewAsEmployeeDialog from "./ViewAsEmployeeDialog";

type MenuFlags = ReturnType<typeof employeeChromeMenuFlags>;

interface EmployeeChromeMenuProps {
  onLogout: () => void;
  /** Messages non lus : affichés sur le burger et sur « שיחות ». */
  chatUnread?: number;
}

function ChromeMenuItems({
  flags,
  exitBusy,
  onExit,
  onViewAs,
  onManager,
  onChats,
  onAccount,
  onLogout,
  chatUnread,
}: {
  chatUnread: number;
  flags: MenuFlags;
  exitBusy: boolean;
  onExit: () => void;
  onViewAs: () => void;
  onManager: () => void;
  onChats: () => void;
  onAccount: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {flags.showExitViewAs ? (
        <MenuItem disabled={exitBusy} onClick={onExit}>
          {he.viewAsExit}
        </MenuItem>
      ) : null}
      {flags.showViewAsEmployee ? (
        <MenuItem onClick={onViewAs}>{he.viewAsEmployee}</MenuItem>
      ) : null}
      {flags.showManagerArea ? (
        <MenuItem onClick={onManager}>{he.managerArea}</MenuItem>
      ) : null}
      <MenuItem onClick={onChats} sx={{ gap: 1.5, justifyContent: "space-between" }}>
        {he.directChatTitle}
        {chatUnread > 0 ? (
          <Chip size="small" color="error" label={chatUnread > 99 ? "99+" : chatUnread} sx={{ height: 20 }} />
        ) : null}
      </MenuItem>
      <MenuItem onClick={onAccount}>{he.myAccount}</MenuItem>
      <MenuItem onClick={onLogout}>{he.logout}</MenuItem>
    </>
  );
}

function ChromeMenuButton({
  open,
  onOpen,
  unread,
}: {
  open: boolean;
  onOpen: (el: HTMLElement) => void;
  unread: number;
}) {
  return (
    <IconButton
      color="inherit"
      aria-label={he.mainMenu}
      aria-controls={open ? "employee-chrome-menu" : undefined}
      aria-haspopup="true"
      aria-expanded={open ? "true" : undefined}
      onClick={(event) => onOpen(event.currentTarget)}
      sx={{ "&:hover": { bgcolor: alpha("#fff", 0.08) } }}
    >
      <Badge color="error" variant="dot" invisible={unread <= 0}>
        <MenuIcon />
      </Badge>
    </IconButton>
  );
}

function useChromeMenuState(onLogout: () => void) {
  const { user, exitViewAs } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const close = () => setAnchor(null);

  const handleExitViewAs = async () => {
    setExitBusy(true);
    try {
      await exitViewAs();
    } finally {
      setExitBusy(false);
      close();
    }
  };

  return { user, navigate, anchor, setAnchor, viewAsOpen, setViewAsOpen, exitBusy, close, handleExitViewAs, onLogout };
}

export default function EmployeeChromeMenu({ onLogout, chatUnread = 0 }: EmployeeChromeMenuProps) {
  const menu = useChromeMenuState(onLogout);
  return (
    <>
      <ChromeMenuButton open={Boolean(menu.anchor)} onOpen={menu.setAnchor} unread={chatUnread} />
      <Menu
        id="employee-chrome-menu"
        anchorEl={menu.anchor}
        open={Boolean(menu.anchor)}
        onClose={menu.close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ChromeMenuItems
          chatUnread={chatUnread}
          flags={employeeChromeMenuFlags(menu.user)}
          exitBusy={menu.exitBusy}
          onExit={() => void menu.handleExitViewAs()}
          onViewAs={() => {
            menu.close();
            menu.setViewAsOpen(true);
          }}
          onManager={() => {
            menu.close();
            menu.navigate("/manager");
          }}
          onChats={() => {
            menu.close();
            menu.navigate("/employee/chats");
          }}
          onAccount={() => {
            menu.close();
            menu.navigate("/employee/account");
          }}
          onLogout={() => {
            menu.close();
            menu.onLogout();
          }}
        />
      </Menu>
      <ViewAsEmployeeDialog open={menu.viewAsOpen} onClose={() => menu.setViewAsOpen(false)} />
    </>
  );
}
