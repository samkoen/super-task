import { useCallback, useEffect, useState } from "react";
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
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError, type User, type UserRole } from "../../services/api";
import { networkService, type Network } from "../../services/networkService";
import { branchService, type Branch } from "../../services/branchService";
import { userService } from "../../services/userService";
import { needsNetworkField, needsBranchField } from "../../utils/userScopeForm";
import { he } from "../../i18n/he";

const CREATABLE_ROLES: UserRole[] = ["network_manager", "branch_manager"];

const roleLabels: Record<UserRole, string> = {
  admin: he.roleAdmin,
  network_manager: he.roleNetworkManager,
  branch_manager: he.roleBranchManager,
  employee: he.roleEmployee,
};

const emptyForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "branch_manager" as UserRole,
  network_id: "",
  branch_id: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [userList, networkList, branchList] = await Promise.all([
        userService.list(),
        networkService.list(),
        branchService.list(),
      ]);
      setUsers(userList);
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

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        network_id: needsNetworkField(form.role) ? form.network_id : undefined,
        branch_id: needsBranchField(form.role) ? form.branch_id : undefined,
      };
      const res = await userService.create(payload);
      setOpen(false);
      setForm(emptyForm);
      setSuccess(res.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const scopeLabel = (u: User) => {
    if (u.branch_name) return u.branch_name;
    if (u.network_name) return u.network_name;
    return "—";
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{he.adminUsers}</Typography>
          <Typography variant="body2" color="text.secondary">{he.adminUsersSubtitle}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          {he.newUser}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {loading && users.length === 0 ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{he.fullName}</TableCell>
                <TableCell>{he.email}</TableCell>
                <TableCell>{he.role}</TableCell>
                <TableCell>{he.scope}</TableCell>
                <TableCell>{he.emailVerifiedStatus}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.full_name}</TableCell>
                  <TableCell dir="ltr">{u.email}</TableCell>
                  <TableCell><Chip label={roleLabels[u.role]} size="small" /></TableCell>
                  <TableCell>{scopeLabel(u)}</TableCell>
                  <TableCell>
                    <Chip label={u.email_verified ? he.verified : he.pending} color={u.email_verified ? "success" : "warning"} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newUser}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label={he.firstName} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required fullWidth />
          <TextField label={he.lastName} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required fullWidth />
          <TextField label={he.email} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth dir="ltr" />
          <TextField label={he.password} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required fullWidth dir="ltr" />
          <TextField select label={he.role} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, network_id: "", branch_id: "" })} fullWidth>
            {CREATABLE_ROLES.map((role) => (
              <MenuItem key={role} value={role}>{roleLabels[role]}</MenuItem>
            ))}
          </TextField>
          {needsNetworkField(form.role) && (
            <TextField select label={he.network} value={form.network_id} onChange={(e) => setForm({ ...form, network_id: e.target.value })} required fullWidth>
              {networks.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </TextField>
          )}
          {needsBranchField(form.role) && (
            <TextField select label={he.branch} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} required fullWidth>
              {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={22} color="inherit" /> : he.submit}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
