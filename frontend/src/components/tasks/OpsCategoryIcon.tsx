import type { SvgIconComponent } from "@mui/icons-material";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import type { OpsCategory } from "../../services/taskService";
import { opsCategoryLabel } from "../../utils/fixedTaskTemplates";

const ICONS: Record<OpsCategory, SvgIconComponent> = {
  cleaning: CleaningServicesIcon,
  fronts_signage: ViewWeekIcon,
  orders: ShoppingCartIcon,
  info_collection: FactCheckIcon,
};

interface OpsCategoryIconProps {
  category?: OpsCategory | null;
  fontSize?: number;
}

/** Icône du type opérationnel (KPI), à côté du titre tâche. */
export default function OpsCategoryIcon({ category, fontSize = 18 }: OpsCategoryIconProps) {
  if (!category) return null;
  const Icon = ICONS[category];
  if (!Icon) return null;
  const label = opsCategoryLabel(category);
  return (
    <Icon
      titleAccess={label}
      sx={{ fontSize, color: "text.secondary", flexShrink: 0 }}
    />
  );
}
