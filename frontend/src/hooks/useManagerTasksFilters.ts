import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { defaultRangeFrom, shiftDay, todayIso, type TaskDateViewMode } from "../utils/dateView";
import { buildManagerTasksPath, parseManagerTasksSearchParams } from "../utils/managerTaskFilters";
import { writeManagerScopeBranchId } from "../utils/managerScopeBranch";

export type ManagerTasksFilterValues = {
  branch: string;
  employee: string;
  status: string;
  day: string;
  mode: TaskDateViewMode;
  from: string;
  to: string;
};

/** Filtres lus dans l'adresse dès le premier rendu : le premier chargement vise déjà le bon snif. */
function initialFilters(params: URLSearchParams): ManagerTasksFilterValues {
  const url = parseManagerTasksSearchParams(params);
  return {
    branch: url.branchId ?? "",
    employee: url.employeeId,
    status: url.status,
    day: url.dueOn || todayIso(),
    mode: url.dateViewMode,
    from: url.rangeFrom || todayIso(),
    to: url.rangeTo || defaultRangeFrom(todayIso(), 7).to,
  };
}

function pathFor(f: ManagerTasksFilterValues, canPickBranch: boolean): string {
  return buildManagerTasksPath({
    branchId: canPickBranch ? f.branch : undefined,
    employeeId: f.employee,
    status: f.status,
    dueOn: f.day,
    dateViewMode: f.mode,
    rangeFrom: f.from,
    rangeTo: f.to,
  });
}

/** Une adresse modifiée de l'extérieur (lien profond, retour arrière) remplace les filtres. */
function useFiltersFromUrl(canPickBranch: boolean, apply: (patch: Partial<ManagerTasksFilterValues>) => void) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (!location.search) return;
    const parsed = parseManagerTasksSearchParams(searchParams);
    apply({ employee: parsed.employeeId, status: parsed.status, day: parsed.dueOn, mode: parsed.dateViewMode, from: parsed.rangeFrom, to: parsed.rangeTo });
    if (canPickBranch && parsed.branchId) {
      apply({ branch: parsed.branchId });
      writeManagerScopeBranchId(parsed.branchId);
    }
  }, [location.search, searchParams, canPickBranch, apply]);
}

/** Filtres de l'onglet משימות (snif, oved, statut, jour), gardés dans l'adresse. */
export function useManagerTasksFilters(canPickBranch: boolean) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(searchParams));
  const apply = useCallback((patch: Partial<ManagerTasksFilterValues>) => setFilters((f) => ({ ...f, ...patch })), []);
  useFiltersFromUrl(canPickBranch, apply);

  /** Change un filtre et réécrit l'adresse. */
  const update = useCallback((patch: Partial<ManagerTasksFilterValues>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    navigate(pathFor(next, canPickBranch), { replace: true });
    if (patch.branch !== undefined) writeManagerScopeBranchId(patch.branch);
  }, [filters, navigate, canPickBranch]);

  const moveDay = (delta: number) => update({ day: shiftDay(filters.day, delta), mode: "day" });
  return { filters, update, moveDay };
}
