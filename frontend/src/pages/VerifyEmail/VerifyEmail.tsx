import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Alert, Button, CircularProgress } from "@mui/material";
import AuthLayout from "../../components/ui/AuthLayout";
import { authService } from "../../services/authService";
import { ApiError } from "../../services/api";
import { he } from "../../i18n/he";

type VerifyState = "loading" | "success" | "already" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerifyState>(token ? "loading" : "error");
  const [errorMsg, setErrorMsg] = useState(token ? "" : he.verifyEmailMissingToken);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authService.verifyEmail(token);
        if (cancelled) return;
        setState(res.already_verified ? "already" : "success");
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setErrorMsg(err instanceof ApiError ? err.message : he.errorGeneric);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "loading") {
    return (
      <AuthLayout title={he.verifyEmailTitle}>
        <CircularProgress sx={{ alignSelf: "center" }} />
      </AuthLayout>
    );
  }

  const message =
    state === "success"
      ? he.verifyEmailSuccess
      : state === "already"
        ? he.verifyEmailAlreadyDone
        : errorMsg;

  return (
    <AuthLayout title={he.verifyEmailTitle}>
      <Alert severity={state === "error" ? "error" : "success"} sx={{ mb: 2 }}>
        {message}
      </Alert>
      {state !== "error" && (
        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
          {he.login}
        </Button>
      )}
    </AuthLayout>
  );
}
