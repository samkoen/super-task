import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import { userService } from "../../services/userService";
import FixedTaskCreateStudio from "../../components/tasks/fixed/studio/FixedTaskCreateStudio";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useFixedTaskCreate } from "../../hooks/useFixedTaskCreate";
import { he } from "../../i18n/he";
import { ApiError } from "../../services/api";
import { asList } from "../../utils/asList";
import { withSelfAssignee } from "../../utils/assigneeOptions";
import { clearFixedTaskCreateDraft, MANAGER_FIXED_TASKS_DRAFT_KEY } from "../../utils/fixedTaskScreenDraft";

/** Page plein écran « משימה קבועה חדשה » (studio dans le style du FLOW 1 de l'oved). */
export default function ManagerFixedTaskCreatePage() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  const listPath = useLocation().pathname.startsWith("/admin") ? "/admin/fixed-tasks" : "/manager/fixed-tasks";
  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const [team, setTeam] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([userService.listTeam("employee"), canPickBranch ? branchService.list() : Promise.resolve([] as Branch[])])
      .then(([emps, list]) => {
        if (!alive) return;
        setTeam(asList<User>(emps));
        setBranches(asList<Branch>(list));
      })
      .catch((e) => alive && showError(e instanceof ApiError ? e.message : he.errorGeneric))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [canPickBranch, showError]);

  const employees = useMemo(() => withSelfAssignee(team, user), [team, user]);
  const backToList = useCallback(async () => {
    clearFixedTaskCreateDraft(MANAGER_FIXED_TASKS_DRAFT_KEY);
    navigate(listPath);
  }, [navigate, listPath]);
  const create = useFixedTaskCreate(backToList);

  if (loading) return <ListSkeleton variant="dashboard" />;
  return (
    <FixedTaskCreateStudio
      branches={branches}
      employees={employees}
      canPickBranch={canPickBranch}
      defaultBranchId={user?.branch_id ?? ""}
      currentUserId={user?.id}
      saving={create.saving}
      onSubmit={create.submit}
      onCancel={() => {
        clearFixedTaskCreateDraft(MANAGER_FIXED_TASKS_DRAFT_KEY);
        navigate(listPath);
      }}
      onError={showError}
      rememberKey={MANAGER_FIXED_TASKS_DRAFT_KEY}
    />
  );
}
