import { Box, ButtonBase } from "@mui/material";
import { studioPillSx } from "../../tasks/fixed/studio/studioUi";
import { he } from "../../../i18n/he";
import { MANAGER_TASKS_VIEWS, type ManagerTasksView } from "../../../utils/managerShell";

type Props = {
  active: ManagerTasksView;
  onSelect: (view: ManagerTasksView) => void;
};

/** Pastilles de l'onglet משימות : היום · קבועות · ספרייה (une seule entrée au lieu de quatre). */
export default function ManagerTasksViewSwitch({ active, onSelect }: Props) {
  return (
    <Box role="tablist" aria-label={he.managerTasksViewsLabel} data-testid="manager-tasks-views" sx={{ display: "flex", gap: "8px", mb: 2, flexWrap: "wrap" }}>
      {MANAGER_TASKS_VIEWS.map(({ view }) => (
        <ButtonBase
          key={view}
          role="tab"
          aria-selected={active === view}
          data-testid={`manager-tasks-view-${view}`}
          onClick={() => onSelect(view)}
          sx={studioPillSx(active === view)}
        >
          {he.managerTasksViewLabels[view]}
        </ButtonBase>
      ))}
    </Box>
  );
}
