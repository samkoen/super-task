import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError } from "../../services/api";
import type { User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import { fixedTaskService, type FixedTaskGroup } from "../../services/fixedTaskService";
import { userService } from "../../services/userService";
import FixedTaskGroupCard from "../../components/tasks/fixed/FixedTaskGroupCard";
import FixedTaskListFilters from "../../components/tasks/fixed/FixedTaskListFilters";
import FixedTaskWizard from "../../components/tasks/fixed/FixedTaskWizard";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useFixedTaskCreate } from "../../hooks/useFixedTaskCreate";
import { he } from "../../i18n/he";
import { asList } from "../../utils/asList";
import { withSelfAssignee } from "../../utils/assigneeOptions";
import { filterFixedGroups, sortFixedGroups, type FixedGroupFilter } from "../../utils/fixedTaskGroups";
import { MANAGER_FIXED_TASKS_DRAFT_KEY } from "../../utils/fixedTaskScreenDraft";

/** Liste des tâches fixes : une carte par tâche ; le détail (réglages + snifim) est une page à part. */
export default function ManagerFixedTasksPage() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  const basePath = useLocation().pathname.startsWith("/admin") ? "/admin/fixed-tasks" : "/manager/fixed-tasks";
  const [groups, setGroups] = useState<FixedTaskGroup[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<FixedGroupFilter>("all");
  const [query, setQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("");

  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const scopeBranchId = canPickBranch ? filterBranch || undefined : user?.branch_id || undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, emps, branchList] = await Promise.all([
        fixedTaskService.list(scopeBranchId),
        userService.listTeam("employee"),
        canPickBranch ? branchService.list() : Promise.resolve([] as Branch[]),
      ]);
      setGroups(list);
      setTeam(asList<User>(emps));
      setBranches(asList<Branch>(branchList));
      setLoadError("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : he.errorGeneric;
      setLoadError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [scopeBranchId, canPickBranch, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const employees = useMemo(() => withSelfAssignee(team, user), [team, user]);
  const create = useFixedTaskCreate(load);
  const rows = useMemo(
    () => sortFixedGroups(filterFixedGroups(groups, filter, query)),
    [groups, filter, query],
  );

  return (
    <Box>
      <PageHeader
        title={he.managerFixedTasks}
        subtitle={he.managerFixedTasksSubtitle}
        action={
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => create.setOpen(true)}
            sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 800 }}
          >
            {he.newFixedTask}
          </Button>
        }
      />
      <FixedTaskListFilters
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        branches={canPickBranch ? branches : []}
        branchId={filterBranch}
        onBranchChange={setFilterBranch}
      />
      {loading && groups.length === 0 ? (
        <ListSkeleton variant="table" />
      ) : loadError ? (
        <Alert severity="error">{loadError}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          title={he.managerFixedTasksEmpty}
          description={he.managerFixedTasksEmptyHint}
          actionLabel={he.newFixedTask}
          onAction={() => create.setOpen(true)}
        />
      ) : (
        <Box display="grid" gap={1.5} gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}>
          {rows.map((group) => (
            <FixedTaskGroupCard
              key={group.key}
              group={group}
              onOpen={() => navigate(`${basePath}/${group.key}`)}
            />
          ))}
        </Box>
      )}
      {create.open && (
        <FixedTaskWizard
          open
          onClose={() => create.setOpen(false)}
          onSubmit={create.submit}
          branches={branches}
          employees={employees}
          canPickBranch={canPickBranch}
          defaultBranchId={user?.branch_id ?? ""}
          rememberKey={MANAGER_FIXED_TASKS_DRAFT_KEY}
          saving={create.saving}
          onError={showError}
          currentUserId={user?.id}
        />
      )}
    </Box>
  );
}
