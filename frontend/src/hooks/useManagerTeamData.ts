import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "../services/api";
import { dashboardService, type TeamMember } from "../services/dashboardService";
import { userService } from "../services/userService";
import { he } from "../i18n/he";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { todayIso } from "../utils/dateView";
import { buildTeamRoster } from "../utils/managerTeam";
import { useManagerBranchScope } from "./useManagerBranchScope";
import { useTaskChangeListener } from "./useTaskChangeListener";

/**
 * Données de l'onglet « צוות » : comptes du périmètre et état du jour de chacun.
 * L'état vient de `/dashboard/manager` ; s'il manque (vue réseau sans suivi), la liste reste affichée.
 */
export function useManagerTeamData() {
  const scope = useManagerBranchScope();
  const [users, setUsers] = useState<User[]>([]);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { canPickBranch, selectedBranch, scopeBranchId } = scope;
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    const mine = ++seq.current;
    if (!silent) setLoading(true);
    const dashboard = dashboardService.getManager(canPickBranch ? selectedBranch || undefined : undefined, todayIso()).catch(() => null);
    try {
      const [list, dash] = await Promise.all([userService.listTeam("employee"), dashboard]);
      if (mine !== seq.current) return;
      setUsers(list);
      setTeam(dash?.team ?? null);
      setError("");
    } catch (e) {
      if (mine === seq.current) setError(apiErrorMessage(e, he.managerTeamLoadError));
    } finally {
      if (mine === seq.current && !silent) setLoading(false);
    }
  }, [canPickBranch, selectedBranch]);

  useEffect(() => { void load(); }, [load]);
  useTaskChangeListener(useCallback(() => { void load(true); }, [load]));
  const roster = useMemo(() => buildTeamRoster(users, team, scopeBranchId), [users, team, scopeBranchId]);
  return { ...scope, users, roster, loading, error, reload: load };
}
