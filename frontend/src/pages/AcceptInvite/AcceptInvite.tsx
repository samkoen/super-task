import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import AuthLayout from "../../components/ui/AuthLayout";
import { ApiError, type UserRole } from "../../services/api";
import { invitationService, type JobFunction } from "../../services/invitationService";
import { he } from "../../i18n/he";

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

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [jobFunction, setJobFunction] = useState<JobFunction | null>(null);

  const [form, setForm] = useState({ first_name: "", last_name: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreviewError(he.inviteMissingToken);
      setPreviewLoading(false);
      return;
    }
    invitationService
      .preview(token)
      .then((data) => {
        setEmail(data.email);
        setRole(data.role);
        setJobFunction(data.job_function);
      })
      .catch((err) => {
        setPreviewError(err instanceof ApiError ? err.message : he.errorGeneric);
      })
      .finally(() => setPreviewLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await invitationService.accept({ token, ...form });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  if (previewLoading) {
    return (
      <AuthLayout title={he.acceptInviteTitle}>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </AuthLayout>
    );
  }

  if (previewError) {
    return (
      <AuthLayout title={he.acceptInviteTitle}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {previewError}
        </Alert>
        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
          {he.login}
        </Button>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title={he.acceptInviteTitle}>
        <Alert severity="success" sx={{ mb: 2 }}>
          {he.acceptInviteSuccess}
        </Alert>
        <Button variant="contained" fullWidth onClick={() => navigate("/login")}>
          {he.login}
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={he.acceptInviteTitle}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {he.acceptInviteSubtitle}
      </Typography>
      <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography variant="body2">
          {he.email}: <strong dir="ltr">{email}</strong>
        </Typography>
        <Typography variant="body2">
          {he.role}: <strong>{roleLabels[role]}</strong>
        </Typography>
        {jobFunction && (
          <Typography variant="body2">
            {he.jobFunction}: <strong>{jobLabels[jobFunction]}</strong>
          </Typography>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
        <TextField
          label={he.firstName}
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          required
          fullWidth
        />
        <TextField
          label={he.lastName}
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          required
          fullWidth
        />
        <TextField
          label={he.password}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          fullWidth
          dir="ltr"
        />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : he.completeRegistration}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: "center" }}>
        {he.hasAccount}{" "}
        <Link component={RouterLink} to="/login" fontWeight={600}>
          {he.login}
        </Link>
      </Typography>
    </AuthLayout>
  );
}
