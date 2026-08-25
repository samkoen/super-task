import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Alert, Button } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { he } from "../../i18n/he";
import { viewAsEmployeeName } from "../../utils/viewAsPreview";

export default function ViewAsBanner() {
  const { user, exitViewAs } = useAuth();
  const [busy, setBusy] = useState(false);
  const name = viewAsEmployeeName(user);

  const handleExit = async () => {
    setBusy(true);
    try {
      await exitViewAs();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Alert
      severity="warning"
      icon={<VisibilityOutlinedIcon />}
      sx={{ borderRadius: 0, fontWeight: 600, alignItems: "center" }}
      action={
        <Button color="inherit" size="small" disabled={busy} onClick={() => void handleExit()}>
          {he.viewAsExit}
        </Button>
      }
    >
      {name ? `${he.viewAsEmployeeBanner}: ${name}` : he.viewAsEmployeeBanner}
    </Alert>
  );
}
