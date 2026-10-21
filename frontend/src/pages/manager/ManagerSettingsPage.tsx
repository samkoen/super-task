import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Paper, TextField } from "@mui/material";
import PageHeader from "../../components/ui/PageHeader";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";
import { ApiError } from "../../services/api";
import { mediaRetentionService } from "../../services/mediaRetentionService";
import { parseRetentionDays } from "../../utils/mediaRetentionDays";

function useRetentionDraft(showError: (message: string) => void) {
  const [days, setDays] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    mediaRetentionService
      .get()
      .then((setting) => {
        if (!cancelled) setDays(String(setting.retention_days));
      })
      .catch((error) => {
        if (!cancelled) showError(error instanceof ApiError ? error.message : he.errorGeneric);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showError]);

  return { days, setDays, loading };
}

async function persistRetentionDays(
  days: string,
  showError: (message: string) => void,
  showSuccess: (message: string) => void,
  setDays: (value: string) => void,
): Promise<void> {
  const parsed = parseRetentionDays(days);
  if (parsed == null) {
    showError(he.mediaRetentionInvalid);
    return;
  }
  const saved = await mediaRetentionService.update(parsed);
  setDays(String(saved.retention_days));
  showSuccess(he.mediaRetentionSaved);
}

export default function ManagerSettingsPage() {
  const { showError, showSuccess } = useFeedback();
  const { days, setDays, loading } = useRetentionDraft(showError);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await persistRetentionDays(days, showError, showSuccess, setDays);
    } catch (error) {
      showError(error instanceof ApiError ? error.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title={he.managerSettings} subtitle={he.mediaRetentionHint} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 420 }}>
        {loading ? (
          <CircularProgress size={22} />
        ) : (
          <TextField
            label={he.mediaRetentionDays}
            type="number"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            fullWidth
            slotProps={{ htmlInput: { min: 0, max: 365, inputMode: "numeric" } }}
          />
        )}
        <Button variant="contained" sx={{ mt: 2 }} disabled={loading || saving} onClick={() => void save()}>
          {he.mediaRetentionSave}
        </Button>
      </Paper>
    </Box>
  );
}
