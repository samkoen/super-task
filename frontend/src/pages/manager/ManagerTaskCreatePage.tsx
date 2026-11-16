import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { User } from "../../services/api";
import { ApiError } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import type { TaskGalleryItem } from "../../services/taskGalleryService";
import { userService } from "../../services/userService";
import FixedTaskCreateStudio from "../../components/tasks/fixed/studio/FixedTaskCreateStudio";
import TaskGalleryPickerDialog from "../../components/tasks/TaskGalleryPickerDialog";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useStudioTaskCreate } from "../../hooks/useStudioTaskCreate";
import { he } from "../../i18n/he";
import { asList } from "../../utils/asList";
import { withSelfAssignee } from "../../utils/assigneeOptions";
import { clearFixedTaskCreateDraft } from "../../utils/fixedTaskScreenDraft";
import type { WizardForm } from "../../utils/fixedTaskWizard";
import type { AdHocTaskPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import { withManagerBranchQuery } from "../../utils/managerScopeBranch";
import { formForScopeBranch, formFromGalleryItem, formFromIssue, onceDefaults } from "../../utils/studioOnce";

export const MANAGER_ONCE_TASK_DRAFT_KEY = "manager-once-task";

function useStudioPeople(canPickBranch: boolean) {
  const { user } = useAuth();
  const { showError } = useFeedback();
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
    return () => { alive = false; };
  }, [canPickBranch, showError]);
  return { employees: useMemo(() => withSelfAssignee(team, user), [team, user]), branches, loading };
}

/** D'où vient la création : bibliothèque (modèle choisi), signalement, ou une tâche neuve. */
function useStartingPoint() {
  const [params] = useSearchParams();
  const issue = (useLocation().state as { adHocPrefillFromIssue?: AdHocTaskPrefillFromIssue } | null)?.adHocPrefillFromIssue;
  const fromLibrary = params.get("library") === "1";
  const scopeBranch = params.get("branch");
  const [galleryItem, setGalleryItem] = useState<TaskGalleryItem | null>(null);
  const initial: Partial<WizardForm> | null = useMemo(() => {
    if (fromLibrary) return galleryItem ? { ...formForScopeBranch(scopeBranch), ...formFromGalleryItem(galleryItem) } : null;
    if (issue) return formFromIssue(issue);
    return { ...formForScopeBranch(scopeBranch), ...onceDefaults() };
  }, [fromLibrary, galleryItem, issue, scopeBranch]);
  const remembers = !fromLibrary && !issue;
  return { initial, fromLibrary, galleryItem, setGalleryItem, remembers, scopeBranch };
}

/**
 * Studio unique (étape 5) : « + › משימה חדשה », un modèle de la bibliothèque ou un signalement
 * ouvrent tous le même écran ; « פעם אחת » est choisi d'office, la récurrence reste à un geste.
 */
export default function ManagerTaskCreatePage() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  const admin = useLocation().pathname.startsWith("/admin");
  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const people = useStudioPeople(canPickBranch);
  const start = useStartingPoint();
  const listPath = withManagerBranchQuery(admin ? "/admin/tasks" : "/manager/tasks", start.scopeBranch);
  const leave = useCallback(() => {
    clearFixedTaskCreateDraft(MANAGER_ONCE_TASK_DRAFT_KEY);
    navigate(listPath);
  }, [navigate, listPath]);
  const create = useStudioTaskCreate(leave, start.galleryItem?.id);

  if (start.fromLibrary && !start.galleryItem) {
    return <TaskGalleryPickerDialog open onClose={leave} onSelect={start.setGalleryItem} />;
  }
  if (people.loading || !start.initial) return <ListSkeleton variant="dashboard" />;
  return (
    <FixedTaskCreateStudio
      key={start.galleryItem?.id ?? "new"}
      branches={people.branches}
      employees={people.employees}
      canPickBranch={canPickBranch}
      defaultBranchId={user?.branch_id ?? ""}
      currentUserId={user?.id}
      saving={create.saving}
      onSubmit={create.submit}
      onCancel={leave}
      onError={showError}
      rememberKey={start.remembers ? MANAGER_ONCE_TASK_DRAFT_KEY : undefined}
      allowOnce
      initialForm={start.initial}
    />
  );
}
