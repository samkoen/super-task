import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Paper, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError } from "../../services/api";
import { departmentService, type Department } from "../../services/departmentService";
import { branchService, type Branch } from "../../services/branchService";
import { he } from "../../i18n/he";

export default function AdmindepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ branch_id: "", name: "", sort_order: 0 });
  const [edit, setEdit] = useState<Department | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [departments, branchList] = await Promise.all([departmentService.list(), branchService.list()]);
      setItems(departments);
      setBranches(branchList);
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
        const res = await departmentService.update(edit.id, { ...form, is_active: edit.is_active });
        setSuccess(res.message);
      } else {
        const res = await departmentService.create(form);
        setSuccess(res.message);
      }
      setOpen(false);
      setEdit(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{he.adminDepartments}</Typography>
          <Typography variant="body2" color="text.secondary">{he.adminDepartmentsSubtitle}</Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setEdit(null); setForm({ branch_id: "", name: "", sort_order: 0 }); setOpen(true); }}>
          {he.newDepartment}
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
                <TableCell>{he.branch}</TableCell>
                <TableCell>{he.sortOrder}</TableCell>
                <TableCell>{he.status}</TableCell>
                <TableCell>{he.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.branch_name || "—"}</TableCell>
                  <TableCell>{m.sort_order}</TableCell>
                  <TableCell><Chip label={m.is_active ? he.active : he.inactive} size="small" /></TableCell>
                  <TableCell><Button size="small" onClick={() => { setEdit(m); setForm({ branch_id: m.branch_id, name: m.name, sort_order: m.sort_order }); setOpen(true); }}>{he.edit}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{edit ? he.editDepartment : he.newDepartment}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.branch} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} required fullWidth>
            {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField label={he.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
          <TextField label={he.sortOrder} type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} fullWidth />
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
