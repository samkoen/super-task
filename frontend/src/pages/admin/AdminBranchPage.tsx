import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Paper, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError } from "../../services/api";
import { networkService, type Network } from "../../services/networkService";
import { branchService, type Branch } from "../../services/branchService";
import { he } from "../../i18n/he";

const emptyForm = { network_id: "", name: "", address: "", city: "", postal_code: "" };

export default function AdminBranchPage() {
  const [items, setItems] = useState<Branch[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [edit, setEdit] = useState<Branch | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [branches, networkList] = await Promise.all([branchService.list(), networkService.list()]);
      setItems(branches);
      setNetworks(networkList);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      if (edit) {
        const res = await branchService.update(edit.id, { ...form, is_active: edit.is_active });
        setSuccess(res.message);
      } else {
        const res = await branchService.create(form);
        setSuccess(res.message);
      }
      setOpen(false);
      setForm(emptyForm);
      setEdit(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const openEdit = (s: Branch) => {
    setEdit(s);
    setForm({ network_id: s.network_id, name: s.name, address: s.address, city: s.city, postal_code: s.postal_code });
    setOpen(true);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{he.adminBranches}</Typography>
          <Typography variant="body2" color="text.secondary">{he.adminBranchesSubtitle}</Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setEdit(null); setForm(emptyForm); setOpen(true); }}>
          {he.newBranch}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}
      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{he.name}</TableCell>
                <TableCell>{he.network}</TableCell>
                <TableCell>{he.city}</TableCell>
                <TableCell>{he.status}</TableCell>
                <TableCell>{he.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.network_name || "—"}</TableCell>
                  <TableCell>{s.city || "—"}</TableCell>
                  <TableCell><Chip label={s.is_active ? he.active : he.inactive} size="small" color={s.is_active ? "success" : "default"} /></TableCell>
                  <TableCell><Button size="small" onClick={() => openEdit(s)}>{he.edit}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{edit ? he.editBranch : he.newBranch}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.network} value={form.network_id} onChange={(e) => setForm({ ...form, network_id: e.target.value })} required fullWidth>
            {networks.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </TextField>
          <TextField label={he.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
          <TextField label={he.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth />
          <TextField label={he.city} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} fullWidth />
          <TextField label={he.postalCode} value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} fullWidth dir="ltr" />
          {edit && (
            <Box display="flex" alignItems="center" gap={1}>
              <Switch checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
              <Typography>{he.active}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleSave}>{he.submit}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
