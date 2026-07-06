import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PeopleIcon from "@mui/icons-material/People";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ApiError } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import {
  dashboardService,
  type DashboardAlert,
  type ManagerDashboard,
} from "../../services/dashboardService";
import HealthBadge, { healthDotColor } from "../../components/dashboard/HealthBadge";
import StatCard from "../../components/dashboard/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { he } from "../../i18n/he";

function formatHebrewDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function alertLabel(alert: DashboardAlert): string {
  if (alert.type === "overdue") return he.alertOverdue;
  if (alert.type === "delegation") return he.alertDelegation;
  return he.alertDueSoon;
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canPickBranch = user?.role === "admin" || user?.role === "network_manager";

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const branchId = canPickBranch ? selectedBranch || undefined : undefined;
      setData(await dashboardService.getManager(branchId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canPickBranch, selectedBranch]);

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

  const completionPercent = useMemo(() => {
    if (!data) return 0;
    return Math.round((data.counts.completion_rate ?? 0) * 100);
  }, [data]);

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            {data?.branch ? `${he.branch}: ${data.branch.name}` : he.dashboardNetworkOverview}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data ? formatHebrewDate(data.due_on) : ""}
            {user?.full_name ? ` · ${he.welcome(user.full_name)}` : ""}
          </Typography>
        </Box>
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
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

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
                    {Math.round(b.completion_rate * 100)}% · {b.pending} {he.pending} · {b.overdue} {he.dashboardOverdue}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {data?.branch && (
        <>
          <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>{he.dashboardToday}</Typography>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                {he.dashboardCompletion}
              </Typography>
              <Box flex={1}>
                <LinearProgress variant="determinate" value={completionPercent} sx={{ height: 10, borderRadius: 5 }} />
              </Box>
              <Typography fontWeight={800}>{completionPercent}%</Typography>
            </Box>
          </Paper>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={he.dashboardActiveEmployees}
                value={`${data.counts.employees_active ?? 0} / ${data.counts.employees_total ?? 0}`}
                icon={<PeopleIcon color="primary" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={he.dashboardOverdue}
                value={data.counts.overdue_open ?? 0}
                icon={<WarningAmberIcon color="error" />}
                accent="#d32f2f"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={he.pending}
                value={(data.counts.tasks_pending ?? 0) + (data.counts.tasks_in_progress ?? 0)}
                icon={<TaskAltIcon color="warning" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={he.dashboardPendingDelegation}
                value={data.counts.pending_delegation ?? 0}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>{he.dashboardUrgentAlerts}</Typography>
                {data.recent_alerts.length === 0 ? (
                  <Alert severity="success">{he.dashboardNoAlerts}</Alert>
                ) : (
                  <List dense disablePadding>
                    {data.recent_alerts.map((alert) => (
                      <ListItem key={`${alert.occurrence_id}-${alert.type}`} divider sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography component="span" fontWeight={700}>{alert.title}</Typography>
                              <Typography component="span" variant="caption" color="text.secondary">
                                ({alertLabel(alert)})
                              </Typography>
                            </Box>
                          }
                          secondary={`${alert.department_name || he.noDepartment}${alert.assignee_name ? ` · ${alert.assignee_name}` : ""}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>{he.dashboardTeamLive}</Typography>
                <List dense disablePadding>
                  {(data.team ?? []).map((member) => (
                    <ListItem key={member.user_id} divider sx={{ px: 0 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: member.is_active ? healthDotColor(member.status === "in_progress" ? "orange" : "green") : "grey.400",
                          ml: 1,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={member.full_name}
                        secondary={
                          member.current_task_title
                            ? `${member.current_department_name || ""} · ${member.current_task_title}`
                            : member.is_active
                              ? he.teamActive
                              : he.teamIdle
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>{he.dashboardDepartmentsLive}</Typography>
            <Grid container spacing={2}>
              {(data.by_department ?? []).map((dept) => (
                <Grid item xs={12} sm={6} md={4} key={dept.department_id ?? "none"}>
                  <Paper variant="outlined" sx={{ p: 2, borderInlineStart: `4px solid`, borderColor: healthDotColor(dept.health) }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography fontWeight={700}>{dept.name}</Typography>
                      <HealthBadge level={dept.health} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {dept.total === 0
                        ? he.noTasks
                        : dept.overdue > 0
                          ? `${dept.overdue} ${he.dashboardOverdue}`
                          : dept.pending + dept.in_progress > 0
                            ? `${dept.pending + dept.in_progress} ${he.pending}`
                            : `${Math.round(dept.completion_rate * 100)}% ${he.taskCompleted}`}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/manager/tasks")}>
              {he.dashboardCreateTask}
            </Button>
            <Button variant="outlined" startIcon={<TaskAltIcon />} onClick={() => navigate("/manager/tasks")}>
              {he.dashboardViewTasks}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
