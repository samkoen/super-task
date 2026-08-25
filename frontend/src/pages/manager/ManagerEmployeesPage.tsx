import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { ApiError, type JobFunction, type User } from "../../services/api";
import { EMPLOYEE_LANGUAGES, EMPLOYEE_LANGUAGE_LABELS, employeeLanguageLabel, type EmployeeLanguage } from "../../domain/employeeLanguages";
import { branchService, type Branch } from "../../services/branchService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { he } from "../../i18n/he";
import { userBelongsToBranch, userBranchLabels } from "../../utils/userBranchMembership";
import EmployeeAvatar from "../../components/employee/EmployeeAvatar";

const JOB_FUNCTIONS: JobFunction[] = ["head_cashier", "stockers", "warehouse_worker"];

const emptyForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  phone: "",
  job_function: "head_cashier" as JobFunction,
  branch_id: "",
  preferred_language: "he" as EmployeeLanguage,
};

export default function ManagerEmployeesPage() {
  const { user, viewAs } = useAuth();
  const isNetworkManager = user?.role === "network_manager";
  const isBranchManager = user?.role === "branch_manager";

  const [employees, setEmployees] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [accessConfirmOpen, setAccessConfirmOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<User | null>(null);
  const [accessTarget, setAccessTarget] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [addBranchId, setAddBranchId] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [team, branchList] = await Promise.all([
        userService.listTeam("employee"),
        isNetworkManager ? branchService.list() : Promise.resolve([]),
      ]);
      setEmployees(team);
      setBranches(branchList);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [isNetworkManager]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleEmployees = useMemo(
    () =>
      filterBranch
        ? employees.filter((u) => userBelongsToBranch(u, filterBranch))
        : employees,
    [employees, filterBranch]
  );

  const addableBranches = useMemo(() => {
    if (!edit || !isNetworkManager) return [];
    const existing = new Set(
      (edit.branches ?? []).map((b) => b.branch_id).concat(edit.branch_id ? [edit.branch_id] : [])
    );
    return branches.filter((b) => !existing.has(b.id));
  }, [edit, isNetworkManager, branches]);

  const canAddMyBranch = useMemo(() => {
    if (!edit || !isBranchManager || !user?.branch_id) return false;
    return !userBelongsToBranch(edit, user.branch_id);
  }, [edit, isBranchManager, user?.branch_id]);

  const openCreate = () => {
    setEdit(null);
    setAddBranchId("");
    setForm({ ...emptyForm, branch_id: isBranchManager ? user?.branch_id ?? "" : "" });
    setAvatarFile(null);
    setAvatarPreview("");
    setOpen(true);
  };

  const openEdit = (employee: User) => {
    setEdit(employee);
    setAddBranchId("");
    setForm({
      email: employee.email,
      password: "",
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone ?? "",
      job_function: employee.job_function ?? "head_cashier",
      branch_id: employee.branch_id ?? "",
      preferred_language: (employee.preferred_language ?? "he") as EmployeeLanguage,
    });
    setAvatarFile(null);
    setAvatarPreview(employee.avatar_url ?? "");
    setOpen(true);
  };

  const openAccessConfirm = (employee: User) => {
    setAccessTarget(employee);
    setAccessConfirmOpen(true);
  };

  const openPasswordDialog = (employee: User) => {
    setPasswordTarget(employee);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (edit) {
        const res = await userService.updateTeamEmployee(edit.id, {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || undefined,
          job_function: form.job_function,
          preferred_language: form.preferred_language,
        });
        if (avatarFile) await userService.uploadTeamAvatar(res.user.id, avatarFile);
        setSuccess(res.message || he.employeeUpdated);
      } else {
        const res = await userService.createTeamEmployee({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || undefined,
          job_function: form.job_function,
          branch_id: isNetworkManager ? form.branch_id : undefined,
          preferred_language: form.preferred_language,
        });
        if (avatarFile) await userService.uploadTeamAvatar(res.user.id, avatarFile);
        setSuccess(res.message || he.employeeCreated);
      }
      setOpen(false);
      setEdit(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBranch = async () => {
    if (!edit) return;
    const branchId = isBranchManager ? user?.branch_id : addBranchId;
    if (!branchId) return;
    setSaving(true);
    setError("");
    try {
      const res = await userService.addTeamEmployeeMembership(edit.id, branchId);
      setSuccess(res.message || he.employeeBranchAdded);
      setEdit(res.user);
      setAddBranchId("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleAccessToggle = async () => {
    if (!accessTarget) return;
    setSaving(true);
    setError("");
    try {
      const res = await userService.setTeamEmployeeAccess(accessTarget.id, !accessTarget.is_active);
      setAccessConfirmOpen(false);
      setAccessTarget(null);
      setSuccess(res.message || (accessTarget.is_active ? he.employeeAccessRevoked : he.employeeAccessGranted));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordTarget) return;
    if (newPassword !== confirmPassword) {
      setError(he.passwordMismatch);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await userService.resetTeamEmployeePassword(passwordTarget.id, newPassword);
      setPasswordOpen(false);
      setPasswordTarget(null);
      setSuccess(res.message || he.employeePasswordReset);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleViewAs = async (employee: User) => {
    setError("");
    try {
      await viewAs(employee.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const jobLabel = (value: JobFunction | null) =>
    value ? he.jobFunctionLabels[value] : "—";

  const languageLabel = (value: EmployeeLanguage | null | undefined) => employeeLanguageLabel(value);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5" fontWeight={700}>{he.managerEmployees}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isBranchManager && user?.branch_name
              ? `${he.branch}: ${user.branch_name}`
              : he.managerEmployeesSubtitle}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {he.newEmployee}
        </Button>
      </Box>

      {isNetworkManager && branches.length > 0 && (
        <Box mb={2} maxWidth={280}>
          <TextField
            select
            fullWidth
            size="small"
            label={he.branch}
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <MenuItem value="">{he.all}</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {loading && employees.length === 0 ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{he.fullName}</TableCell>
                <TableCell>{he.loginIdentifier}</TableCell>
                <TableCell>{he.phone}</TableCell>
                <TableCell>{he.jobFunction}</TableCell>
                <TableCell>{he.employeeLanguage}</TableCell>
                {isNetworkManager && <TableCell>{he.branch}</TableCell>}
                <TableCell>{he.appAccess}</TableCell>
                <TableCell>{he.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isNetworkManager ? 8 : 7} align="center">
                    {he.noEmployees}
                  </TableCell>
                </TableRow>
              ) : (
                visibleEmployees.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell dir="ltr">{u.email}</TableCell>
                    <TableCell dir="ltr">{u.phone || "—"}</TableCell>
                    <TableCell>{jobLabel(u.job_function)}</TableCell>
                    <TableCell>{languageLabel(u.preferred_language)}</TableCell>
                    {isNetworkManager && (
                      <TableCell>
                        {userBranchLabels(u).length > 0
                          ? userBranchLabels(u).join(", ")
                          : u.branch_name || "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip
                        label={u.is_active ? he.active : he.inactive}
                        color={u.is_active ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={he.viewAsEmployee}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => void handleViewAs(u)}
                            disabled={!u.is_active}
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={he.edit}>
                        <IconButton size="small" onClick={() => openEdit(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={he.resetEmployeePassword}>
                        <IconButton size="small" onClick={() => openPasswordDialog(u)}>
                          <VpnKeyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.is_active ? he.revokeAppAccess : he.grantAppAccess}>
                        <IconButton
                          size="small"
                          color={u.is_active ? "warning" : "success"}
                          onClick={() => openAccessConfirm(u)}
                          disabled={u.id === user?.id}
                        >
                          {u.is_active ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{edit ? he.editEmployee : he.newEmployee}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <EmployeeAvatar
              name={`${form.first_name} ${form.last_name}`.trim() || he.employeeAvatar}
              photoUrl={avatarPreview || null}
              size={72}
            />
            <Box>
              <Button component="label" variant="outlined" size="small">
                {he.employeeAvatar}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {he.employeeAvatarHint}
              </Typography>
            </Box>
          </Box>
          <TextField label={he.firstName} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required fullWidth />
          <TextField label={he.lastName} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required fullWidth />
          <TextField
            label={he.loginIdentifier}
            helperText={he.loginIdentifierHint}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            fullWidth
            dir="ltr"
          />
          {!edit && (
            <TextField
              label={he.password}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              fullWidth
              dir="ltr"
            />
          )}
          <TextField label={he.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth dir="ltr" />
          <TextField select label={he.jobFunction} value={form.job_function} onChange={(e) => setForm({ ...form, job_function: e.target.value as JobFunction })} required fullWidth>
            {JOB_FUNCTIONS.map((jf) => (
              <MenuItem key={jf} value={jf}>{he.jobFunctionLabels[jf]}</MenuItem>
            ))}
          </TextField>
          {isNetworkManager && !edit && (
            <TextField select label={he.branch} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} required fullWidth>
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
          )}
          {edit && (
            <Box>
              <Typography variant="subtitle2" mb={1}>{he.employeeBranches}</Typography>
              <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5}>
                {(edit.branches ?? []).length > 0
                  ? edit.branches!.map((b) => (
                      <Chip
                        key={b.branch_id}
                        size="small"
                        label={b.branch_name || b.branch_id}
                        color={b.is_primary ? "primary" : "default"}
                      />
                    ))
                  : (
                      <Chip size="small" label={edit.branch_name || edit.branch_id || "—"} color="primary" />
                    )}
              </Box>
              {isNetworkManager && (
                addableBranches.length > 0 ? (
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label={he.addEmployeeBranch}
                      value={addBranchId}
                      onChange={(e) => setAddBranchId(e.target.value)}
                    >
                      {addableBranches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="outlined"
                      disabled={saving || !addBranchId}
                      onClick={() => void handleAddBranch()}
                      sx={{ whiteSpace: "nowrap", mt: 0.5 }}
                    >
                      {he.addEmployeeBranch}
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {he.noMoreBranchesToAdd}
                  </Typography>
                )
              )}
              {canAddMyBranch && (
                <Button
                  variant="outlined"
                  size="small"
                  disabled={saving}
                  onClick={() => void handleAddBranch()}
                >
                  {he.addToMyBranch}
                </Button>
              )}
            </Box>
          )}
          <TextField
            select
            label={he.employeeLanguage}
            value={form.preferred_language}
            onChange={(e) => setForm({ ...form, preferred_language: e.target.value as EmployeeLanguage })}
            required
            fullWidth
          >
            {EMPLOYEE_LANGUAGES.map((lang) => (
              <MenuItem key={lang} value={lang}>{EMPLOYEE_LANGUAGE_LABELS[lang]}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={22} color="inherit" /> : he.submit}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={accessConfirmOpen} onClose={() => setAccessConfirmOpen(false)} dir="rtl">
        <DialogTitle>
          {accessTarget?.is_active ? he.revokeAppAccess : he.grantAppAccess}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {accessTarget?.is_active ? he.confirmRevokeAppAccess : he.confirmGrantAppAccess}
          </Typography>
          {accessTarget && (
            <Typography fontWeight={600} mt={1}>{accessTarget.full_name}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAccessConfirmOpen(false)} disabled={saving}>{he.cancel}</Button>
          <Button
            variant="contained"
            color={accessTarget?.is_active ? "warning" : "success"}
            onClick={handleAccessToggle}
            disabled={saving}
          >
            {accessTarget?.is_active ? he.revokeAppAccess : he.grantAppAccess}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle>{he.resetEmployeePassword}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {passwordTarget && (
            <Typography variant="body2" color="text.secondary">{passwordTarget.full_name}</Typography>
          )}
          <TextField
            label={he.newPassword}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            fullWidth
            dir="ltr"
          />
          <TextField
            label={he.confirmPassword}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
            dir="ltr"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasswordOpen(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handlePasswordReset} disabled={saving}>
            {saving ? <CircularProgress size={22} color="inherit" /> : he.submit}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
