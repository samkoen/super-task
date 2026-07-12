import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import AuthLayout from "../../components/ui/AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../services/api";
import { authService } from "../../services/authService";
import { he } from "../../i18n/he";
import { getHomePath } from "../../config/routes";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (user) {
      navigate(getHomePath(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");
    setShowResend(false);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setShowResend(err.status === 403 && err.message === he.emailNotVerified);
      } else {
        setError(he.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await authService.resendVerification(email.trim());
      setResendMessage(res.message);
    } catch (err) {
      setResendMessage(err instanceof ApiError ? err.message : he.errorGeneric);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout title={he.login}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {resendMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {resendMessage}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
        <TextField
          label={he.loginIdentifier}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          dir="ltr"
          autoComplete="username"
        />
        <TextField
          label={he.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          dir="ltr"
        />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : he.login}
        </Button>
        {showResend && (
          <Button variant="outlined" onClick={handleResend} disabled={resendLoading || !email.trim()}>
            {resendLoading ? <CircularProgress size={22} /> : he.resendVerification}
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: "center" }}>
        {he.inviteOnlyHint}
      </Typography>
    </AuthLayout>
  );
}
