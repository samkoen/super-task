import { useEffect, useState } from "react";
import { CircularProgress, Paper, Typography } from "@mui/material";
import { ApiError } from "../../services/api";
import { networkService, type Network } from "../../services/networkService";
import { useFeedback } from "../../context/FeedbackContext";
import NetworkManagesAllSwitch from "../network/NetworkManagesAllSwitch";
import { he } from "../../i18n/he";

export default function ManagerNetworkChatSetting() {
  const { showError, showSuccess } = useFeedback();
  const [network, setNetwork] = useState<Network | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    networkService
      .list()
      .then((items) => {
        if (!cancelled) setNetwork(items[0] ?? null);
      })
      .catch((e) => {
        if (!cancelled) showError(e instanceof ApiError ? e.message : he.errorGeneric);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showError]);

  const toggle = async (next: boolean) => {
    if (!network) return;
    setSaving(true);
    try {
      const res = await networkService.update(network.id, { manages_all_workers: next });
      setNetwork(res.network);
      showSuccess(res.message);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <CircularProgress size={22} />;
  }
  if (!network) return null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, maxWidth: 560 }}>
      <Typography variant="h6" fontWeight={700} mb={1}>
        {he.directChatTitle}
      </Typography>
      <NetworkManagesAllSwitch
        checked={Boolean(network.manages_all_workers)}
        onChange={(next) => void toggle(next)}
        disabled={saving}
      />
    </Paper>
  );
}
