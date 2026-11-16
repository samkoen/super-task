import { useState, type ReactNode } from "react";
import { Box, Button } from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import StudioSheet from "../../tasks/fixed/studio/StudioSheet";
import { studioSecondarySx } from "../../tasks/fixed/studio/studioUi";
import ViewAsEmployeeDialog from "../ViewAsEmployeeDialog";
import { he } from "../../../i18n/he";
import type { ManagerMoreItem } from "../../../utils/managerShell";
import ManagerSheetRow from "./ManagerSheetRow";

const ICONS: Record<ManagerMoreItem, ReactNode> = {
  myTasks: <TaskAltIcon />,
  reports: <AssessmentOutlinedIcon />,
  branches: <StoreOutlinedIcon />,
  invitations: <MailOutlineIcon />,
  settings: <SettingsOutlinedIcon />,
  account: <AccountCircleOutlinedIcon />,
  systemBugs: <BugReportOutlinedIcon />,
};

type Props = {
  open: boolean;
  title: string;
  items: ManagerMoreItem[];
  onClose: () => void;
  onSelect: (item: ManagerMoreItem) => void;
  onLogout: () => void;
};

/**
 * Sheet « עוד », ouverte par l'avatar : tout ce qui est rare (המשימות שלי, דוחות, הגדרות,
 * compte…), puis « צפייה כעובד » et la déconnexion.
 */
export default function ManagerMoreSheet({ open, title, items, onClose, onSelect, onLogout }: Props) {
  const [viewAsOpen, setViewAsOpen] = useState(false);
  return (
    <>
      <StudioSheet open={open} title={title} subtitle={he.managerMoreTitle} onClose={onClose} testId="manager-more-sheet">
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((item) => (
            <ManagerSheetRow
              key={item}
              testId={`manager-more-${item}`}
              label={he.managerMoreLabels[item]}
              icon={ICONS[item]}
              onClick={() => onSelect(item)}
            />
          ))}
        </Box>
        <ManagerSheetRow
          testId="manager-more-view-as"
          label={he.viewAsEmployee}
          icon={<VisibilityOutlinedIcon />}
          onClick={() => {
            onClose();
            setViewAsOpen(true);
          }}
        />
        <Button type="button" startIcon={<LogoutIcon />} onClick={onLogout} data-testid="manager-more-logout" sx={studioSecondarySx}>
          {he.logout}
        </Button>
      </StudioSheet>
      <ViewAsEmployeeDialog open={viewAsOpen} onClose={() => setViewAsOpen(false)} />
    </>
  );
}
