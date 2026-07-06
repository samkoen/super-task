import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError, type User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import TaskOccurrenceGrid from "../../components/tasks/TaskOccurrenceGrid";
import {
  taskService,
  type TaskOccurrence,
  type TaskRecurrence,
} from "../../services/taskService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { he } from "../../i18n/he";

const RECURRENCES: TaskRecurrence[] = ["daily", "weekly", "biweekly"];
const WEEKDAYS = [
  { value: "0", label: he.weekdayMon },
  { value: "1", label: he.weekdayTue },
  { value: "2", label: he.weekdayWed },
  { value: "3", label: he.weekdayThu },
  { value: "4", label: he.weekdayFri },
  { value: "5", label: he.weekdaySat },
  { value: "6", label: he.weekdaySun },
];

export default function ManagerTasksPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([]);
  const [pending, setPending] = useState<TaskOccurrence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openFixed, setOpenFixed] = useState(false);
  const [openAdHoc, setOpenAdHoc] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState<TaskOccurrence | null>(null);
  const [delegateAssignee, setDelegateAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");

  const [fixedForm, setFixedForm] = useState({
    branch_id: "",
    title: "",
    description: "",
    recurrence: "daily" as TaskRecurrence,
    due_time: "09:00",
    weekly_days: "0",
    assignee_user_id: "",
  });

  const [adHocForm, setAdHocForm] = useState({
    branch_id: "",
    title: "",
    description: "",
    due_at: "",
    assignee_user_id: "",
  });

  const isBranchManager = user?.role === "branch_manager";
  const isNetworkManager = user?.role === "network_manager";

  const filterEmployees = useMemo(
    () => (filterBranch ? employees.filter((u) => u.branch_id === filterBranch) : employees),
    [employees, filterBranch]
  );

  const filteredEmployees = useMemo(
    () => (fixedForm.branch_id ? employees.filter((u) => u.branch_id === fixedForm.branch_id) : employees),
    [employees, fixedForm.branch_id]
  );

  const filterByAssignee = useCallback(
    (rows: TaskOccurrence[]) => {
      if (!filterEmployee) return rows;
      return rows.filter((o) => o.assignee_user_id === filterEmployee);
    },
    [filterEmployee]
  );

  const displayedOccurrences = useMemo(
    () => filterByAssignee(occurrences),
    [occurrences, filterByAssignee]
  );

  const displayedPending = useMemo(
    () => (filterEmployee ? [] : pending),
    [pending, filterEmployee]
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const branchId = filterBranch || undefined;
      const [occ, pend, branchList, team] = await Promise.all([
        taskService.listOccurrences(branchId ? { branch_id: branchId } : undefined),
        isBranchManager ? taskService.listOccurrences({ pending_delegation: true }) : Promise.resolve([]),
        branchService.list(),
        userService.listTeam("employee"),
      ]);
      setOccurrences(occ);
      setPending(pend);
      setBranches(branchList);
      setEmployees(team);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filterBranch, isBranchManager]);

  useEffect(() => {
    load();
  }, [load]);

  useTaskChangeListener(useCallback(() => {
    load(true);
  }, [load]));

  useEffect(() => {
    if (user?.branch_id) {
      setFixedForm((f) => ({ ...f, branch_id: user.branch_id ?? "" }));
      setAdHocForm((f) => ({ ...f, branch_id: user.branch_id ?? "" }));
    }
  }, [user]);

  useEffect(() => {
    if (filterEmployee && !filterEmployees.some((u) => u.id === filterEmployee)) {
      setFilterEmployee("");
    }
  }, [filterEmployee, filterEmployees]);

  const handleCreateFixed = async () => {
    setSaving(true);
    try {
      const res = await taskService.createTemplate({
        ...fixedForm,
        weekly_days: fixedForm.recurrence !== "daily" ? fixedForm.weekly_days : undefined,
      });
      setOpenFixed(false);
      setSuccess(res.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdHoc = async () => {
    setSaving(true);
    try {
      const res = await taskService.createAdHoc({
        branch_id: adHocForm.branch_id,
        title: adHocForm.title,
        description: adHocForm.description,
        due_at: new Date(adHocForm.due_at).toISOString(),
        assignee_user_id: isBranchManager ? adHocForm.assignee_user_id || undefined : undefined,
        photo_required: true,
      });
      setOpenAdHoc(false);
      setSuccess(res.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateTarget) return;
    setSaving(true);
    try {
      await taskService.delegate(delegateTarget.id, delegateAssignee);
      setDelegateTarget(null);
      setDelegateAssignee("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (task: TaskOccurrence) => {
    setError("");
    try {
      await taskService.cancel(task.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5" fontWeight={700}>{he.managerTasks}</Typography>
          <Typography variant="body2" color="text.secondary">{he.managerTasksSubtitle}</Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <TextField select size="small" label={he.branch} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">{he.all}</MenuItem>
            {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label={he.filterByEmployee} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">{he.all}</MenuItem>
            {filterEmployees.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
          </TextField>
          {isBranchManager && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenFixed(true)}>{he.newFixedTask}</Button>
          )}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAdHoc(true)}>{he.newAdHocTask}</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`${he.allTasks} (${displayedOccurrences.length})`} />
        {isBranchManager && <Tab label={`${he.pendingDelegation} (${displayedPending.length})`} />}
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : tab === 0 ? (
        <TaskOccurrenceGrid
          tasks={displayedOccurrences}
          isBranchManager={isBranchManager}
          onDelegate={(task) => { setDelegateTarget(task); setDelegateAssignee(""); }}
          onCancel={handleCancel}
        />
      ) : (
        <TaskOccurrenceGrid
          tasks={displayedPending}
          emptyMessage={filterEmployee ? he.noTasks : he.noTasks}
          isBranchManager={isBranchManager}
          onDelegate={(task) => { setDelegateTarget(task); setDelegateAssignee(""); }}
        />
      )}

      <Dialog open={openFixed} onClose={() => setOpenFixed(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newFixedTask}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.branch} value={fixedForm.branch_id} onChange={(e) => setFixedForm({ ...fixedForm, branch_id: e.target.value })} required fullWidth>
            {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField label={he.taskTitle} value={fixedForm.title} onChange={(e) => setFixedForm({ ...fixedForm, title: e.target.value })} required fullWidth />
          <TextField select label={he.assignee} value={fixedForm.assignee_user_id} onChange={(e) => setFixedForm({ ...fixedForm, assignee_user_id: e.target.value })} required fullWidth>
            {filteredEmployees.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
          </TextField>
          <TextField select label={he.recurrence} value={fixedForm.recurrence} onChange={(e) => setFixedForm({ ...fixedForm, recurrence: e.target.value as TaskRecurrence })} fullWidth>
            {RECURRENCES.map((r) => <MenuItem key={r} value={r}>{he.recurrenceLabels[r]}</MenuItem>)}
          </TextField>
          <TextField label={he.dueTime} type="time" value={fixedForm.due_time} onChange={(e) => setFixedForm({ ...fixedForm, due_time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth dir="ltr" />
          {fixedForm.recurrence !== "daily" && (
            <TextField select label={he.weekday} value={fixedForm.weekly_days} onChange={(e) => setFixedForm({ ...fixedForm, weekly_days: e.target.value })} fullWidth>
              {WEEKDAYS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenFixed(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleCreateFixed} disabled={saving}>{saving ? <CircularProgress size={22} /> : he.submit}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAdHoc} onClose={() => setOpenAdHoc(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newAdHocTask}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.branch} value={adHocForm.branch_id} onChange={(e) => setAdHocForm({ ...adHocForm, branch_id: e.target.value })} required fullWidth disabled={isBranchManager}>
            {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField label={he.taskTitle} value={adHocForm.title} onChange={(e) => setAdHocForm({ ...adHocForm, title: e.target.value })} required fullWidth />
          <TextField label={he.description} value={adHocForm.description} onChange={(e) => setAdHocForm({ ...adHocForm, description: e.target.value })} multiline rows={2} fullWidth />
          <TextField label={he.dueAt} type="datetime-local" value={adHocForm.due_at} onChange={(e) => setAdHocForm({ ...adHocForm, due_at: e.target.value })} InputLabelProps={{ shrink: true }} required fullWidth dir="ltr" />
          {isBranchManager && (
            <TextField select label={he.assignee} value={adHocForm.assignee_user_id} onChange={(e) => setAdHocForm({ ...adHocForm, assignee_user_id: e.target.value })} required fullWidth>
              {employees.filter((u) => u.branch_id === adHocForm.branch_id).map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
              ))}
            </TextField>
          )}
          {isNetworkManager && (
            <Alert severity="info">{he.adHocNetworkManagerHint}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAdHoc(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleCreateAdHoc} disabled={saving}>{saving ? <CircularProgress size={22} /> : he.submit}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!delegateTarget} onClose={() => setDelegateTarget(null)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle>{he.delegateTask}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" mb={2}>{delegateTarget?.title}</Typography>
          <TextField select label={he.assignee} value={delegateAssignee} onChange={(e) => setDelegateAssignee(e.target.value)} fullWidth required>
            {employees.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelegateTarget(null)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleDelegate} disabled={saving || !delegateAssignee}>{he.delegateTask}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
