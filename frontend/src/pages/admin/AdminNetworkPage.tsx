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
  Paper,
  Switch,
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
import { ApiError } from "../../services/api";
import { networkService, type Network } from "../../services/networkService";
import { he } from "../../i18n/he";

export default function AdminNetworkPage() {
  const [items, setItems] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [edit, setEdit] = useState<Network | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await networkService.list());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setError("");
    try {
      if (edit) {
        const res = await networkService.update(edit.id, { name, is_active: edit.is_active });
        setSuccess(res.message);
      } else {
        const res = await networkService.create(name);
        setSuccess(res.message);
      }
      setOpen(false);
      setName("");
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
          <Typography variant="h5" fontWeight={700}>{he.adminNetworks}</Typography>
          <Typography variant="body2" color="text.secondary">{he.adminNetworksSubtitle}</Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setEdit(null); setName(""); setOpen(true); }}>
          {he.newNetwork}
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
                <TableCell>{he.status}</TableCell>
                <TableCell>{he.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    <Chip label={r.is_active ? he.active : he.inactive} color={r.is_active ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => { setEdit(r); setName(r.name); setOpen(true); }}>{he.edit}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{edit ? he.editNetwork : he.newNetwork}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField label={he.name} value={name} onChange={(e) => setName(e.target.value)} fullWidth required sx={{ mt: 1 }} />
          {edit && (
            <Box display="flex" alignItems="center" gap={1} mt={2}>
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
