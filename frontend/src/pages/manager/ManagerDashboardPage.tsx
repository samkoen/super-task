import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { ApiError } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import {
  dashboardService,
  type ManagerDashboard,
} from "../../services/dashboardService";
import DepartmentProgressGrid from "../../components/dashboard/DepartmentProgressGrid";
import HealthBadge from "../../components/dashboard/HealthBadge";
import ManagerDayNav from "../../components/dashboard/ManagerDayNav";
import StoreStatusKpiRow from "../../components/dashboard/StoreStatusKpiRow";
import ActionRequiredCarousel from "../../components/dashboard/ActionRequiredCarousel";
import PendingTasksCarousel from "../../components/dashboard/PendingTasksCarousel";
import StaffProgressOverview from "../../components/dashboard/StaffProgressOverview";
import TaskCompletionReviewDialog from "../../components/tasks/TaskCompletionReviewDialog";
import PageHeader from "../../components/ui/PageHeader";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { he } from "../../i18n/he";
import { todayIso } from "../../utils/dateView";

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<TaskOccurrence | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const canPickBranch = user?.role === "admin" || user?.role === "network_manager";

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const branchId = canPickBranch ? selectedBranch || undefined : undefined;
      setData(await dashboardService.getManager(branchId, selectedDay));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canPickBranch, selectedBranch, selectedDay]);

  useTaskChangeListener(useCallback(() => {
    load(true);
  }, [load]));

  useEffect(() => {
    if (!canPickBranch) {
      load();
      return;
    }
    branchService.list().then(setBranches).catch(() => setBranches([]));
  }, [canPickBranch]);

  useEffect(() => {
    if (canPickBranch && !selectedBranch && user?.branch_id) {
      setSelectedBranch(user.branch_id);
      return;
    }
    if (canPickBranch && branches.length === 1 && !selectedBranch) {
      setSelectedBranch(branches[0].id);
      return;
    }
    load();
  }, [load, canPickBranch, selectedBranch, branches, user?.branch_id]);

  const handleReviewTask = useCallback(async (taskId: string) => {
    setReviewLoading(true);
    setError("");
    try {
      const occurrence = await taskService.getOccurrence(taskId);
      setReviewTarget(occurrence);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  if (loading && !data) {
    return <ListSkeleton variant="dashboard" />;
  }

  return (
    <Box>
      <PageHeader
        title={data?.branch ? `${he.branch}: ${data.branch.name}` : he.dashboardNetworkOverview}
        subtitle={user?.full_name ? he.welcome(user.full_name) : undefined}
        action={
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            {data && <HealthBadge level={data.health} size="medium" />}
            {canPickBranch && (
              <TextField
                select
                size="small"
                label={he.dashboardSelectBranch}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">{he.dashboardNetworkOverview}</MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}
      {reviewLoading && (
        <Box display="flex" justifyContent="center" py={1}>
          <CircularProgress size={24} />
        </Box>
      )}

      {data && !data.branch && data.branches && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>{he.dashboardBranchOverview}</Typography>
          <Grid container spacing={2}>
            {data.branches.map((b) => (
              <Grid item xs={12} sm={6} md={4} key={b.branch_id}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                  onClick={() => setSelectedBranch(b.branch_id)}
                >
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography fontWeight={700}>{b.name}</Typography>
                    <HealthBadge level={b.health} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(b.completion_rate * 100)}% · {b.overdue} {he.dashboardOverdue}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {data?.branch && (
        <>
          <Box mb={2}>
            <ManagerDayNav day={selectedDay} onDayChange={setSelectedDay} />
          </Box>

          <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
            {he.dashboardToday}
          </Typography>
          <StoreStatusKpiRow storeKpis={data.store_kpis} />

          <ActionRequiredCarousel
            queues={data.task_queues}
            onReviewTask={handleReviewTask}
          />
          <PendingTasksCarousel queues={data.task_queues} />

          <StaffProgressOverview team={data.team ?? []} onChanged={() => void load(true)} />

          {data.by_department && data.by_department.length > 0 && (
            <DepartmentProgressGrid departments={data.by_department} />
          )}

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/manager/tasks", { state: { openNewTask: true } })}
            >
              {he.newTask}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate("/manager/tasks", { state: { openGalleryTask: true } })}
            >
              {he.newTaskFromGallery}
            </Button>
            <Button variant="outlined" startIcon={<TaskAltIcon />} onClick={() => navigate("/manager/tasks")}>
              {he.dashboardViewTasks}
            </Button>
          </Box>
        </>
      )}

      <TaskCompletionReviewDialog
        task={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={(message) => {
          setSuccess(message);
          void load(true);
        }}
      />
    </Box>
  );
}
