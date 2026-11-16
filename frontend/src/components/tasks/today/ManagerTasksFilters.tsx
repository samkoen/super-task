import { useState } from "react";
import { Box, ButtonBase, Menu, MenuItem, Typography } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";

export type FilterOption = { value: string; label: string };

const pillSx = (active: boolean) => ({
  height: 36,
  px: "12px",
  gap: "2px",
  borderRadius: `${flowRadius.full}px`,
  bgcolor: active ? flowColor.navy800 : flowColor.neutral0,
  color: active ? flowColor.neutral0 : flowColor.neutral900,
  ...flowText.label,
  fontSize: 14,
}) as const;

type SelectProps = { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void; testId: string };

/** Pastille « עובד ▾ » : affiche le choix courant, « הכל » remet le filtre à zéro. */
function FilterSelect({ label, value, options, onChange, testId }: SelectProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const chosen = options.find((option) => option.value === value);
  const pick = (next: string) => { setAnchor(null); onChange(next); };
  return (
    <>
      <ButtonBase data-testid={testId} aria-haspopup="menu" onClick={(e) => setAnchor(e.currentTarget)} sx={pillSx(Boolean(chosen))}>
        {chosen?.label ?? label}
        <ArrowDropDownIcon sx={{ fontSize: 20 }} />
      </ButtonBase>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} dir="rtl">
        <MenuItem selected={!value} onClick={() => pick("")}>{he.managerTasksAll}</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} selected={option.value === value} onClick={() => pick(option.value)}>{option.label}</MenuItem>
        ))}
      </Menu>
    </>
  );
}

type DayNavProps = { label: string; onPrev: () => void; onNext: () => void };

/** « ‹ היום › » : la flèche de droite recule d'un jour (lecture de droite à gauche). */
function DayNav({ label, onPrev, onNext }: DayNavProps) {
  const arrowSx = { width: 32, height: 36, color: flowColor.neutral900 } as const;
  return (
    <Box sx={{ display: "flex", alignItems: "center", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral0, px: "2px" }}>
      <ButtonBase aria-label={he.managerTasksPrevDay} onClick={onPrev} sx={arrowSx}><ChevronRightIcon fontSize="small" /></ButtonBase>
      <Typography data-testid="tasks-day-label" sx={{ ...flowText.label, fontSize: 14, color: flowColor.neutral900, whiteSpace: "nowrap" }}>{label}</Typography>
      <ButtonBase aria-label={he.managerTasksNextDay} onClick={onNext} sx={arrowSx}><ChevronLeftIcon fontSize="small" /></ButtonBase>
    </Box>
  );
}

type Props = {
  employees: FilterOption[];
  statuses: FilterOption[];
  employeeId: string;
  status: string;
  dayLabel: string;
  onEmployee: (value: string) => void;
  onStatus: (value: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
};

/** Ligne de filtres du Figma : « עובד ▾ », « סטטוס ▾ » à droite, le jour à gauche. */
export default function ManagerTasksFilters(props: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
      <Box sx={{ display: "flex", gap: "8px" }}>
        <FilterSelect testId="tasks-filter-employee" label={he.managerTasksFilterEmployee} value={props.employeeId} options={props.employees} onChange={props.onEmployee} />
        <FilterSelect testId="tasks-filter-status" label={he.managerTasksFilterStatus} value={props.status} options={props.statuses} onChange={props.onStatus} />
      </Box>
      <DayNav label={props.dayLabel} onPrev={props.onPrevDay} onNext={props.onNextDay} />
    </Box>
  );
}
