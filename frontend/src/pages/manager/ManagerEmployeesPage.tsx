import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Box, ButtonBase, Typography } from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import type { User } from "../../services/api";
import ManagerScopePicker from "../../components/dashboard/home/ManagerScopePicker";
import { HomeChip } from "../../components/dashboard/home/homeUi";
import EmployeeAccountSheet from "../../components/team/account/EmployeeAccountSheet";
import { EmployeeAccessDialog, EmployeePasswordDialog } from "../../components/team/account/EmployeeAccountDialogs";
import EmployeeFormDialog from "../../components/team/account/EmployeeFormDialog";
import ManagerEmployeeSheet from "../../components/team/ManagerEmployeeSheet";
import ManagerTeamList from "../../components/team/ManagerTeamList";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useManagerPageHeader } from "../../context/ManagerPageHeaderContext";
import { useEmployeeAccounts } from "../../hooks/useEmployeeAccounts";
import { useManagerTeamData } from "../../hooks/useManagerTeamData";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { teamSummary } from "../../utils/managerTeam";
import { canManageAsTeamEmployee } from "../../utils/teamEmployeeActions";

const EMPLOYEE_QUERY = "employee";

/** Fiche ouverte gardée dans l'adresse (`?employee=`) : on y revient après avoir créé une tâche pour lui. */
function useOpenEmployee() {
  const [params, setParams] = useSearchParams();
  const openId = params.get(EMPLOYEE_QUERY) ?? "";
  const setOpenId = useCallback((id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set(EMPLOYEE_QUERY, id);
      else next.delete(EMPLOYEE_QUERY);
      return next;
    }, { replace: true });
  }, [setParams]);
  return [openId, setOpenId] as const;
}

/** Titre de l'onglet : le snif regardé (ou « כל הרשת ») et le nombre d'oveds. */
function useTeamHeader(team: ReturnType<typeof useManagerTeamData>) {
  const { user } = useAuth();
  const scopeName = team.canPickBranch
    ? team.branches.find((b) => b.id === team.selectedBranch)?.name ?? (team.selectedBranch ? "" : he.managerHomeNetworkTitle)
    : user?.branch_name ?? "";
  const subtitle = [scopeName, team.loading ? "" : he.managerTeamCount(team.roster.length)].filter(Boolean).join(" · ");
  useManagerPageHeader(he.managerTeamTitle, subtitle);
}

function NewEmployeeButton({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      data-testid="team-new-employee"
      onClick={onClick}
      sx={{ height: 40, px: "14px", gap: "6px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral0, color: flowColor.navy800, ...flowText.button }}
    >
      <PersonAddAltRoundedIcon fontSize="small" />
      {he.newEmployee}
    </ButtonBase>
  );
}

type ToolbarProps = { team: ReturnType<typeof useManagerTeamData>; onNewEmployee: () => void };

/** Périmètre (menahel reshet), retards du jour, et « עובד חדש » discret au bout. */
function TeamToolbar({ team, onNewEmployee }: ToolbarProps) {
  const summary = teamSummary(team.roster);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {team.canPickBranch ? <ManagerScopePicker value={team.selectedBranch} branches={team.branches} onChange={team.setSelectedBranch} /> : null}
        {summary.late > 0 ? <HomeChip tone="warning">{he.managerHomeOverdue(summary.late)}</HomeChip> : null}
        <Box sx={{ flex: 1 }} />
        <NewEmployeeButton onClick={onNewEmployee} />
      </Box>
      {!team.loading && summary.total > 0 && !summary.live && team.canPickBranch ? (
        <Typography data-testid="team-no-live" sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{he.managerTeamNoLiveStatus}</Typography>
      ) : null}
    </Box>
  );
}

/**
 * Onglet « צוות » (étape 6) : qui est là, au travail sur quoi, pas arrivé, fini, et les retards.
 * Un oved s'ouvre en fiche ; la gestion des comptes (ancien tableau « עובדים ») passe par « ניהול חשבון ».
 */
export default function ManagerEmployeesPage() {
  const team = useManagerTeamData();
  const accounts = useEmployeeAccounts(() => team.reload(true));
  const [openId, setOpenId] = useOpenEmployee();
  const [accountUser, setAccountUser] = useState<User | null>(null);
  const open = useMemo(() => team.roster.find((e) => e.id === openId) ?? null, [team.roster, openId]);
  useTeamHeader(team);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <TeamToolbar team={team} onNewEmployee={accounts.openCreate} />
      {team.error ? <Alert severity="error">{team.error}</Alert> : null}
      {team.loading ? <ListSkeleton variant="cards" rows={6} /> : (
        <ManagerTeamList entries={team.roster} showBranch={team.canPickBranch && !team.scopeBranchId} emptyText={he.managerHomeTeamEmpty} onOpen={(e) => setOpenId(e.id)} />
      )}
      <ManagerEmployeeSheet
        entry={open}
        onClose={() => setOpenId("")}
        onAccount={open?.user && canManageAsTeamEmployee(open.user.role) ? (e) => setAccountUser(e.user) : undefined}
        onChanged={() => void team.reload(true)}
      />
      <EmployeeAccountSheet user={accountUser} accounts={accounts} onClose={() => setAccountUser(null)} />
      <EmployeeFormDialog accounts={accounts} branches={team.branches} />
      <EmployeeAccessDialog accounts={accounts} />
      <EmployeePasswordDialog accounts={accounts} />
    </Box>
  );
}
