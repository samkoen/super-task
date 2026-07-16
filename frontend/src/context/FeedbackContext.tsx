import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";

export type FeedbackSeverity = "success" | "error" | "info" | "warning";

interface FeedbackContextValue {
  showFeedback: (message: string, severity?: FeedbackSeverity) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<FeedbackSeverity>("success");

  const showFeedback = useCallback((next: string, nextSeverity: FeedbackSeverity = "info") => {
    if (!next.trim()) return;
    setMessage(next);
    setSeverity(nextSeverity);
    setOpen(true);
  }, []);

  const showSuccess = useCallback(
    (next: string) => showFeedback(next, "success"),
    [showFeedback]
  );

  const showError = useCallback(
    (next: string) => showFeedback(next, "error"),
    [showFeedback]
  );

  const value = useMemo(
    () => ({ showFeedback, showSuccess, showError }),
    [showFeedback, showSuccess, showError]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={severity === "error" ? 6000 : 4000}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setOpen(false);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ width: "100%", borderRadius: 2, fontWeight: 600 }}
        >
          {message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return ctx;
}
