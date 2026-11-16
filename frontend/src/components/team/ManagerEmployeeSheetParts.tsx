import type { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { teamRowLine, type TeamRosterEntry } from "../../utils/managerTeam";
import { HomeChip, homeCardSx } from "../dashboard/home/homeUi";
import EmployeeQualityRating from "../employee/EmployeeQualityRating";
import TeamPersonAvatar from "./TeamPersonAvatar";

/** En-tête de la fiche : photo dans l'anneau d'état, ce qu'il fait, son avancement du jour. */
export function EmployeeHero({ entry }: { entry: TeamRosterEntry }) {
  return (
    <Box data-testid="employee-sheet-hero" sx={{ ...homeCardSx, flexDirection: "row", alignItems: "center", gap: "16px" }}>
      <TeamPersonAvatar name={entry.name} initial={entry.initial} state={entry.state} photoUrl={entry.photoUrl} size={64} />
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        <Typography sx={{ ...flowText.body, color: flowColor.neutral900 }}>{teamRowLine(entry, true)}</Typography>
        <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {entry.total > 0 ? <HomeChip>{he.managerTeamProgress(entry.done, entry.total)}</HomeChip> : null}
          {entry.late > 0 ? <HomeChip tone="warning">{he.managerHomeOverdue(entry.late)}</HomeChip> : null}
        </Box>
      </Box>
    </Box>
  );
}

function ActionPill({ label, icon, testId, onClick }: { label: string; icon: ReactNode; testId: string; onClick: () => void }) {
  return (
    <ButtonBase
      data-testid={testId}
      onClick={onClick}
      sx={{ flex: 1, minWidth: 0, height: 56, flexDirection: "column", gap: "2px", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral0, color: flowColor.navy800, ...flowText.label }}
    >
      {icon}
      {label}
    </ButtonBase>
  );
}

type ActionsProps = { onChat: () => void; onNewTask: () => void; onAccount?: () => void };

/** Trois gestes : écrire, lui donner une tâche, gérer son compte (onglet צוות seulement). */
export function EmployeeActions({ onChat, onNewTask, onAccount }: ActionsProps) {
  return (
    <Box sx={{ display: "flex", gap: "8px" }}>
      <ActionPill testId="employee-sheet-chat" label={he.managerEmployeeChat} icon={<ChatBubbleOutlineRoundedIcon />} onClick={onChat} />
      <ActionPill testId="employee-sheet-new-task" label={he.managerEmployeeNewTask} icon={<AddRoundedIcon />} onClick={onNewTask} />
      {onAccount ? <ActionPill testId="employee-sheet-account" label={he.managerEmployeeAccount} icon={<ManageAccountsOutlinedIcon />} onClick={onAccount} /> : null}
    </Box>
  );
}

/** Notes de qualité données lors des validations (moyenne et par catégorie). */
export function EmployeeQuality({ entry }: { entry: TeamRosterEntry }) {
  if (!entry.member) return null;
  return (
    <Box component="section" data-testid="employee-sheet-quality" sx={homeCardSx}>
      <Typography component="h2" sx={{ ...flowText.button, fontSize: 16, color: flowColor.neutral900 }}>{he.managerEmployeeQualityTitle}</Typography>
      <EmployeeQualityRating summary={entry.member.quality_rating} />
    </Box>
  );
}
