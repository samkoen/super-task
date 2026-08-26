import { useEffect, useState } from "react";
import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { ApiError, type User } from "../../services/api";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { he } from "../../i18n/he";

interface ViewAsEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ViewAsEmployeeDialog({ open, onClose }: ViewAsEmployeeDialogProps) {
  const { viewAs } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setLoading(true);
    userService
      .listTeam("employee")
      .then((team) =>
        setEmployees(team.filter((u) => u.is_active && u.role === "employee")),
      )
      .catch((e) => setError(e instanceof ApiError ? e.message : he.errorGeneric))
      .finally(() => setLoading(false));
  }, [open]);

  const handlePick = async (employee: User) => {
    setBusyId(employee.id);
    setError("");
    try {
      await viewAs(employee.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{he.viewAsEmployee}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {he.viewAsEmployeeHint}
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <EmployeePickBody
          loading={loading}
          employees={employees}
          busyId={busyId}
          onPick={handlePick}
        />
      </DialogContent>
    </Dialog>
  );
}

function EmployeePickBody({
  loading,
  employees,
  busyId,
  onPick,
}: {
  loading: boolean;
  employees: User[];
  busyId: string | null;
  onPick: (employee: User) => void;
}) {
  if (loading) return <CircularProgress size={28} />;
  if (employees.length === 0) {
    return <Typography variant="body2">{he.viewAsNoEmployees}</Typography>;
  }
  return (
    <List disablePadding>
      {employees.map((emp) => (
        <ListItemButton
          key={emp.id}
          disabled={busyId !== null}
          onClick={() => onPick(emp)}
        >
          <ListItemText primary={emp.full_name} secondary={emp.branch_name || emp.email} />
        </ListItemButton>
      ))}
    </List>
  );
}
