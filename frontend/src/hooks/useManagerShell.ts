import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomePath } from "../config/routes";
import { canViewSystemBugInbox } from "../utils/systemBugInbox";
import {
  isManagerTabRoot,
  managerCreateNavigation,
  managerMoreItems,
  managerMorePath,
  managerTabPath,
  resolveManagerTab,
  resolveManagerTasksView,
  MANAGER_TASKS_VIEWS,
  type ManagerCreateChoice,
  type ManagerMoreItem,
  type ManagerTab,
  type ManagerTasksView,
} from "../utils/managerShell";
import { withManagerBranchQuery } from "../utils/managerScopeBranch";

/** État et actions de la coque menahel : onglet actif, sheets « + » et « עוד », retour. */
export function useManagerShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
    else navigate(user ? getHomePath(user.role) : "/manager");
  };
  const selectTab = (tab: ManagerTab) => navigate(managerTabPath(tab));
  const selectTasksView = (view: ManagerTasksView) => {
    const item = MANAGER_TASKS_VIEWS.find((v) => v.view === view);
    if (item) navigate(withManagerBranchQuery(item.path));
  };
  const choose = (choice: ManagerCreateChoice) => {
    setCreateOpen(false);
    const target = managerCreateNavigation(choice);
    navigate(target.pathname, target.state ? { state: target.state } : undefined);
  };
  const selectMore = (item: ManagerMoreItem) => {
    setMoreOpen(false);
    navigate(managerMorePath(item));
  };

  return {
    activeTab: resolveManagerTab(pathname),
    tasksView: resolveManagerTasksView(pathname),
    showBack: !isManagerTabRoot(pathname),
    moreItems: managerMoreItems(user?.role, canViewSystemBugInbox(user)),
    createOpen,
    moreOpen,
    openCreate: () => setCreateOpen(true),
    closeCreate: () => setCreateOpen(false),
    openMore: () => setMoreOpen(true),
    closeMore: () => setMoreOpen(false),
    goBack,
    selectTab,
    selectTasksView,
    choose,
    selectMore,
  };
}
