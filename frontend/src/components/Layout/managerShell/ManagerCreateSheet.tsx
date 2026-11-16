import type { ReactNode } from "react";
import { Box } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import StudioSheet from "../../tasks/fixed/studio/StudioSheet";
import { he } from "../../../i18n/he";
import { MANAGER_CREATE_CHOICES, type ManagerCreateChoice } from "../../../utils/managerShell";
import ManagerSheetRow from "./ManagerSheetRow";

const ICONS: Record<ManagerCreateChoice, ReactNode> = {
  adHoc: <BoltRoundedIcon />,
  fixed: <RepeatRoundedIcon />,
  library: <CollectionsBookmarkOutlinedIcon />,
};

type Props = {
  open: boolean;
  onClose: () => void;
  onChoose: (choice: ManagerCreateChoice) => void;
};

/** Sheet du rond « + » : le seul point d'entrée pour créer une tâche (remplace FAB et boutons rapides). */
export default function ManagerCreateSheet({ open, onClose, onChoose }: Props) {
  return (
    <StudioSheet open={open} title={he.managerCreateTitle} onClose={onClose} testId="manager-create-sheet">
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {MANAGER_CREATE_CHOICES.map((choice) => (
          <ManagerSheetRow
            key={choice}
            testId={`manager-create-${choice}`}
            label={he.managerCreateLabels[choice]}
            hint={he.managerCreateHints[choice]}
            icon={ICONS[choice]}
            onClick={() => onChoose(choice)}
          />
        ))}
      </Box>
    </StudioSheet>
  );
}
