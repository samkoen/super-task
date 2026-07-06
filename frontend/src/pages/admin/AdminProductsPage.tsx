import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Paper, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError } from "../../services/api";
import { departmentService, type Department } from "../../services/departmentService";
import { productService, type Product } from "../../services/productService";
import { he } from "../../i18n/he";

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [departments, setdepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ department_id: "", name: "", sku: "" });
  const [edit, setEdit] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [products, mahList] = await Promise.all([productService.list(), departmentService.list()]);
      setItems(products);
      setdepartments(mahList);
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
        const res = await productService.update(edit.id, { ...form, is_active: edit.is_active });
        setSuccess(res.message);
      } else {
        const res = await productService.create(form);
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
          <Typography variant="h5" fontWeight={700}>{he.adminProducts}</Typography>
          <Typography variant="body2" color="text.secondary">{he.adminProductsSubtitle}</Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setEdit(null); setForm({ department_id: "", name: "", sku: "" }); setOpen(true); }}>
          {he.newProduct}
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
                <TableCell>{he.sku}</TableCell>
                <TableCell>{he.department}</TableCell>
                <TableCell>{he.status}</TableCell>
                <TableCell>{he.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.name}</TableCell>
                  <TableCell dir="ltr">{p.sku || "—"}</TableCell>
                  <TableCell>{p.department_name || "—"}</TableCell>
                  <TableCell><Chip label={p.is_active ? he.active : he.inactive} size="small" /></TableCell>
                  <TableCell><Button size="small" onClick={() => { setEdit(p); setForm({ department_id: p.department_id, name: p.name, sku: p.sku }); setOpen(true); }}>{he.edit}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{edit ? he.editProduct : he.newProduct}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.department} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} required fullWidth>
            {departments.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
          <TextField label={he.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
          <TextField label={he.sku} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} fullWidth dir="ltr" />
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
