import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import {
  dashboardService,
  type ManagerDashboard,
} from "../../services/dashboardService";
import {
  promotionStageService,
  type PromotionStage,
} from "../../services/promotionStageService";
import DepartmentProgressGrid from "../../components/dashboard/DepartmentProgressGrid";
import HealthBadge from "../../components/dashboard/HealthBadge";
import ManagerTodayBoard from "../../components/dashboard/ManagerTodayBoard";
import PromotionStagesAnalysisTable from "../../components/dashboard/PromotionStagesAnalysisTable";
import TaskCompletionReviewDialog from "../../components/tasks/TaskCompletionReviewDialog";
import TaskOccurrenceEditDialog from "../../components/tasks/TaskOccurrenceEditDialog";
import EmployeeShiftHeader from "../../components/employee/EmployeeShiftHeader";
import EmployeeAvatarCapture from "../../components/employee/EmployeeAvatarCapture";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { he } from "../../i18n/he";
import { formatHebrewDay, todayIso } from "../../utils/dateView";
import {
  bindNotificationAudioUnlock,
  playManagerQuestionSound,
} from "../../utils/notificationSounds";
import { buildQuestionsQueue } from "../../utils/dashboardCarousels";
import { buildManagerTasksPath } from "../../utils/managerTaskFilters";
import { managerNewTaskNavigation } from "../../utils/managerBottomNav";
import {
  parseBranchFromSearch,
  writeManagerScopeBranchId,
} from "../../utils/managerScopeBranch";
import { managerDashboardMeta } from "../../utils/managerWelcomeSubtitle";
import { homeBranchAfterOverview, showAllWorkersDashboard } from "../../utils/networkDashboard";

/** Masqué temporairement — remettre à true pour réafficher. */
const SHOW_DEPARTMENT_PROGRESS = false;

export default function ManagerDashboardPage() {
  const { user, refresh } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(() => parseBranchFromSearch(searchParams) || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<TaskOccurrence | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editOccurrenceId, setEditOccurrenceId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [stages, setStages] = useState<PromotionStage[]>([]);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const prevQuestionCountRef = useRef<number | null>(null);

  const canPickBranch = user?.role === "admin" || user?.role === "network_manager";
  const scopeBranchId = canPickBranch
    ? selectedBranch
    : user?.branch_id || selectedBranch || "";

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const branchId = canPickBranch ? selectedBranch || undefined : undefined;
      const dash = await dashboardService.getManager(branchId, todayIso());
      setData(dash);
      const bid = dash.branch?.id;
      if (bid) {
        try {
          setStages(await promotionStageService.analysis(bid));
        } catch {
          setStages([]);
        }
      } else {
        setStages([]);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canPickBranch, selectedBranch]);

  useTaskChangeListener(useCallback(() => {
    load(true);
  }, [load]));

  useEffect(() => bindNotificationAudioUnlock(), []);

  useEffect(() => {
    writeManagerScopeBranchId(scopeBranchId);
    if (!canPickBranch) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (selectedBranch) next.set("branch", selectedBranch);
        else next.delete("branch");
        return next;
      },
      { replace: true },
    );
  }, [scopeBranchId, selectedBranch, canPickBranch, setSearchParams]);

  useEffect(() => {
    if (!data?.task_queues) return;
    const count = buildQuestionsQueue(data.task_queues).length;
    const prev = prevQuestionCountRef.current;
    if (prev !== null && count > prev) {
      playManagerQuestionSound();
    }
    prevQuestionCountRef.current = count;
  }, [data?.task_queues]);

  useEffect(() => {
    if (canPickBranch) {
      branchService.list().then(setBranches).catch(() => setBranches([]));
    }
  }, [canPickBranch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const next = homeBranchAfterOverview({
      canPickBranch,
      selectedBranch,
      overviewLoaded: Boolean(data) && !data?.branch,
      managesAllWorkers: data?.manages_all_workers,
      homeBranchId: user?.branch_id,
      onlyBranchId: branches.length === 1 ? branches[0].id : undefined,
    });
    if (next) setSelectedBranch(next);
  }, [canPickBranch, selectedBranch, data, user?.branch_id, branches]);

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

  const handleAvatarCapture = async (file: File) => {
    setAvatarUploading(true);
    try {
      await authService.stylizeAvatar(file);
      await refresh();
      showSuccess(he.employeePhotoStylized);
      setAvatarOpen(false);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarUploading(true);
    try {
      await authService.deleteAvatar();
      await refresh();
      showSuccess(he.employeePhotoDeleted);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setAvatarUploading(false);
    }
  };

  const goTasks = (opts?: { openNewTask?: boolean; openGalleryTask?: boolean }) => {
    const branchId = scopeBranchId || undefined;
    if (opts?.openNewTask) {
      const nav = managerNewTaskNavigation(branchId);
      navigate(nav.pathname, { state: nav.state });
      return;
    }
    navigate(
      buildManagerTasksPath({ branchId }),
      opts?.openGalleryTask ? { state: { openGalleryTask: true } } : undefined,
    );
  };

  const photoUrl = user?.avatar_url;

  return (
    <Box>
      <EmployeeShiftHeader
        dateLabel={formatHebrewDay(todayIso())}
        name={user?.full_name}
        photoUrl={photoUrl}
        photoEditable
        onEditPhoto={() => setAvatarOpen(true)}
        onDeletePhoto={photoUrl ? () => void handleAvatarDelete() : undefined}
        slogan={user?.excellence_slogan}
        meta={managerDashboardMeta({
          branchName: data?.branch?.name || user?.branch_name,
          networkName: data?.network_name || user?.network_name || branches[0]?.network_name,
          role: user?.role,
        })}
        extra={
          canPickBranch ? (
            <ManagerBranchPicker
              value={selectedBranch}
              branches={branches}
              onChange={setSelectedBranch}
            />
          ) : undefined
        }
      />
      <EmployeeAvatarCapture
        open={avatarOpen}
        uploading={avatarUploading}
        uploadingLabel={he.avatarStylizing}
        onClose={() => setAvatarOpen(false)}
        onCapture={handleAvatarCapture}
      />

      {loading && !data ? <ListSkeleton variant="dashboard" /> : null}

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

      {data && showAllWorkersDashboard(data) && (
        <Box mb={3}>
          <ManagerTodayBoard
            data={data}
            title={he.dashboardAllWorkers}
            hint={he.dashboardAllWorkersHint}
            showAnalysis={showAnalysis}
            onToggleAnalysis={() => setShowAnalysis((v) => !v)}
            onReviewTask={(id) => void handleReviewTask(id)}
            onOpenTask={(id) => setEditOccurrenceId(id)}
            onChanged={() => void load(true)}
            onNewTask={() => goTasks({ openNewTask: true })}
            onGalleryTask={() => goTasks({ openGalleryTask: true })}
            onViewTasks={() => goTasks()}
          />
        </Box>
      )}

      {data?.branch && (
        <>
          <ManagerTodayBoard
            data={data}
            showAnalysis={showAnalysis}
            analysisExtra={<PromotionStagesAnalysisTable stages={stages} />}
            onToggleAnalysis={() => setShowAnalysis((v) => !v)}
            onReviewTask={(id) => void handleReviewTask(id)}
            onOpenTask={(id) => setEditOccurrenceId(id)}
            onChanged={() => void load(true)}
            onNewTask={() => goTasks({ openNewTask: true })}
            onGalleryTask={() => goTasks({ openGalleryTask: true })}
            onViewTasks={() => goTasks()}
          />
          {SHOW_DEPARTMENT_PROGRESS &&
            data.by_department &&
            data.by_department.length > 0 && (
              <DepartmentProgressGrid departments={data.by_department} />
            )}
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
      <TaskOccurrenceEditDialog
        occurrenceId={editOccurrenceId}
        onClose={() => setEditOccurrenceId(null)}
        onSaved={(message) => {
          setSuccess(message);
          void load(true);
        }}
      />
    </Box>
  );
}

function ManagerBranchPicker({
  value,
  branches,
  onChange,
}: {
  value: string;
  branches: Branch[];
  onChange: (id: string) => void;
}) {
  return (
    <TextField
      select
      size="small"
      label={he.dashboardSelectBranch}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 180 }}
    >
      <MenuItem value="">{he.dashboardNetworkOverview}</MenuItem>
      {branches.map((b) => (
        <MenuItem key={b.id} value={b.id}>
          {b.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
