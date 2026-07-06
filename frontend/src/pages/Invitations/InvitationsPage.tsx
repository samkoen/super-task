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
import CancelIcon from "@mui/icons-material/Cancel";
import { ApiError, type UserRole } from "../../services/api";
import {
  invitationService,
  type Invitation,
  type JobFunction,
} from "../../services/invitationService";
import { networkService, type Network } from "../../services/networkService";
import { branchService, type Branch } from "../../services/branchService";
import { useAuth } from "../../context/AuthContext";
import {
  filterBranchesForInviter,
  needsNetworkField,
  needsBranchField,
} from "../../utils/userScopeForm";
import { he } from "../../i18n/he";

const JOB_FUNCTIONS: JobFunction[] = ["head_cashier", "stockers", "warehouse_worker"];

const roleLabels: Record<UserRole, string> = {
  admin: he.roleAdmin,
  network_manager: he.roleNetworkManager,
  branch_manager: he.roleBranchManager,
  employee: he.roleEmployee,
};

const jobLabels: Record<JobFunction, string> = {
  head_cashier: he.jobHeadCashier,
  stockers: he.jobStockers,
  warehouse_worker: he.jobWarehouseWorker,
};

const statusLabels: Record<Invitation["status"], string> = {
  pending: he.invitationPending,
  accepted: he.invitationAccepted,
  cancelled: he.invitationCancelled,
  expired: he.invitationExpired,
};

const statusColors: Record<Invitation["status"], "default" | "warning" | "success" | "error"> = {
  pending: "warning",
  accepted: "success",
  cancelled: "default",
  expired: "error",
};

function inviteableRoles(userRole: UserRole): UserRole[] {
  if (userRole === "admin") return ["network_manager", "branch_manager", "employee"];
  if (userRole === "network_manager") return ["branch_manager", "employee"];
  if (userRole === "branch_manager") return ["employee"];
  return [];
}

export default function InvitationsPage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    role: "employee" as UserRole,
    job_function: "head_cashier" as JobFunction,
    network_id: "",
    branch_id: "",
  });

  const rolesForForm = useMemo(
    () => (user ? inviteableRoles(user.role) : []),
    [user]
  );

  const visibleBranches = useMemo(
    () => filterBranchesForInviter(branches, user?.role, user?.network_id),
    [branches, user]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invList, networkList, branchList] = await Promise.all([
        invitationService.list(),
        networkService.list(),
        branchService.list(),
      ]);
      setInvitations(invList);
      setNetworks(networkList);
      setBranches(branchList);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scopeLabel = (inv: Invitation) => {
    if (inv.branch_name) return inv.branch_name;
    if (inv.network_name) return inv.network_name;
    return "—";
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: Parameters<typeof invitationService.create>[0] = {
        email: form.email,
        role: form.role,
      };
      if (form.role === "employee") {
        payload.job_function = form.job_function;
      }
      if (needsNetworkField(form.role)) {
        payload.network_id = form.network_id;
      }
      if (needsBranchField(form.role, user?.role)) {
        payload.branch_id = form.branch_id;
      }
      const res = await invitationService.create(payload);
      setOpen(false);
      setForm({
        email: "",
        role: rolesForForm[rolesForForm.length - 1] ?? "employee",
        job_function: "head_cashier",
        network_id: "",
        branch_id: "",
      });
      setSuccess(res.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    setError("");
    try {
      await invitationService.cancel(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{he.invitations}</Typography>
          <Typography variant="body2" color="text.secondary">{he.invitationsSubtitle}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          {he.newInvitation}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {loading && invitations.length === 0 ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{he.email}</TableCell>
                <TableCell>{he.role}</TableCell>
                <TableCell>{he.scope}</TableCell>
                <TableCell>{he.jobFunction}</TableCell>
                <TableCell>{he.status}</TableCell>
                <TableCell align="center">{he.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell dir="ltr">{inv.email}</TableCell>
                  <TableCell><Chip label={roleLabels[inv.role]} size="small" /></TableCell>
                  <TableCell>{scopeLabel(inv)}</TableCell>
                  <TableCell>{inv.job_function ? jobLabels[inv.job_function] : "—"}</TableCell>
                  <TableCell>
                    <Chip label={statusLabels[inv.status]} color={statusColors[inv.status]} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    {inv.status === "pending" && (
                      <Tooltip title={he.cancelInvitation}>
                        <IconButton size="small" color="warning" onClick={() => handleCancel(inv.id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newInvitation}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label={he.email} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth dir="ltr" />
          <TextField select label={he.role} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, network_id: "", branch_id: "" })} fullWidth>
            {rolesForForm.map((role) => (
              <MenuItem key={role} value={role}>{roleLabels[role]}</MenuItem>
            ))}
          </TextField>
          {needsNetworkField(form.role) && (
            <TextField select label={he.network} value={form.network_id} onChange={(e) => setForm({ ...form, network_id: e.target.value })} required fullWidth>
              {networks.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </TextField>
          )}
          {needsBranchField(form.role, user?.role) && (
            <TextField select label={he.branch} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} required fullWidth>
              {visibleBranches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
          )}
          {form.role === "employee" && (
            <TextField select label={he.jobFunction} value={form.job_function} onChange={(e) => setForm({ ...form, job_function: e.target.value as JobFunction })} fullWidth>
              {JOB_FUNCTIONS.map((jf) => (
                <MenuItem key={jf} value={jf}>{jobLabels[jf]}</MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={22} color="inherit" /> : he.sendInvitation}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
