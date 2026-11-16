import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import { fixedTaskService, type FixedTaskGroup } from "../../services/fixedTaskService";
import FixedTaskGroupCard from "../../components/tasks/fixed/FixedTaskGroupCard";
import FixedTaskListFilters from "../../components/tasks/fixed/FixedTaskListFilters";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";
import { asList } from "../../utils/asList";
import { filterFixedGroups, sortFixedGroups, type FixedGroupFilter } from "../../utils/fixedTaskGroups";

/** Liste des tâches fixes : une carte par tâche ; le détail (réglages + snifim) est une page à part. */
export default function ManagerFixedTasksPage() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const navigate = useNavigate();
  const basePath = useLocation().pathname.startsWith("/admin") ? "/admin/fixed-tasks" : "/manager/fixed-tasks";
  const [groups, setGroups] = useState<FixedTaskGroup[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
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
      const [list, branchList] = await Promise.all([
        fixedTaskService.list(scopeBranchId),
        canPickBranch ? branchService.list() : Promise.resolve([] as Branch[]),
      ]);
      setGroups(list);
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

  const openCreate = () => navigate(`${basePath}/new`);
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
            onClick={openCreate}
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
          onAction={openCreate}
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
    </Box>
  );
}
