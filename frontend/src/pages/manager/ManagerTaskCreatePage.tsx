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
import { useGoBackOr } from "../../hooks/useGoBackOr";
import { useStudioTaskCreate } from "../../hooks/useStudioTaskCreate";
import { he } from "../../i18n/he";
import { asList } from "../../utils/asList";
import { withSelfAssignee } from "../../utils/assigneeOptions";
import { clearFixedTaskCreateDraft } from "../../utils/fixedTaskScreenDraft";
import type { WizardForm } from "../../utils/fixedTaskWizard";
import type { AdHocTaskPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import { withManagerBranchQuery } from "../../utils/managerScopeBranch";
import { formForAssignee, formForScopeBranch, formFromGalleryItem, formFromIssue, onceDefaults, STUDIO_ASSIGNEE_QUERY, studioReturnPath } from "../../utils/studioOnce";

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

type CreateState = { adHocPrefillFromIssue?: AdHocTaskPrefillFromIssue; returnTo?: string } | null;

/** D'où vient la création : bibliothèque (modèle choisi), signalement, fiche d'un oved, ou une tâche neuve. */
function useStartingPoint() {
  const [params] = useSearchParams();
  const state = useLocation().state as CreateState;
  const issue = state?.adHocPrefillFromIssue;
  const fromLibrary = params.get("library") === "1";
  const scopeBranch = params.get("branch");
  const assignee = params.get(STUDIO_ASSIGNEE_QUERY);
  const [galleryItem, setGalleryItem] = useState<TaskGalleryItem | null>(null);
  const initial: Partial<WizardForm> | null = useMemo(() => {
    if (fromLibrary) return galleryItem ? { ...formForScopeBranch(scopeBranch), ...formFromGalleryItem(galleryItem) } : null;
    if (issue) return formFromIssue(issue);
    if (assignee) return formForAssignee(assignee, scopeBranch);
    return { ...formForScopeBranch(scopeBranch), ...onceDefaults() };
  }, [fromLibrary, galleryItem, issue, assignee, scopeBranch]);
  const remembers = !fromLibrary && !issue && !assignee;
  return { initial, fromLibrary, galleryItem, setGalleryItem, remembers, scopeBranch, returnTo: studioReturnPath(state?.returnTo) };
}

/**
 * Studio unique (étape 5) : « + › משימה חדשה », un modèle de la bibliothèque ou un signalement
 * ouvrent tous le même écran. Le type vient du point d'entrée (חד־פעמית, ou celui du modèle) et
 * n'est plus modifiable dans « מתי » ; une tâche récurrente se crée via « + › משימה קבועה ».
 */
export default function ManagerTaskCreatePage() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  const admin = useLocation().pathname.startsWith("/admin");
  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const people = useStudioPeople(canPickBranch);
  const start = useStartingPoint();
  const listPath = start.returnTo ?? withManagerBranchQuery(admin ? "/admin/tasks" : "/manager/tasks", start.scopeBranch);
  const leave = useCallback(() => {
    clearFixedTaskCreateDraft(MANAGER_ONCE_TASK_DRAFT_KEY);
    navigate(listPath);
  }, [navigate, listPath]);
  const goBack = useGoBackOr(listPath);
  /** « חזרה » sans créer : l'écran d'origine (fiche oved, ou la page où l'on a touché « + »). */
  const cancel = useCallback(() => {
    clearFixedTaskCreateDraft(MANAGER_ONCE_TASK_DRAFT_KEY);
    if (start.returnTo) navigate(start.returnTo);
    else goBack();
  }, [navigate, start.returnTo, goBack]);
  const create = useStudioTaskCreate(leave, start.galleryItem?.id);

  if (start.fromLibrary && !start.galleryItem) {
    return <TaskGalleryPickerDialog open onClose={cancel} onSelect={start.setGalleryItem} />;
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
      onCancel={cancel}
      onError={showError}
      rememberKey={start.remembers ? MANAGER_ONCE_TASK_DRAFT_KEY : undefined}
      allowOnce
      initialForm={start.initial}
    />
  );
}
