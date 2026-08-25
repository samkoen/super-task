import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { alpha, Button, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import { he } from "../../i18n/he";
import ViewAsEmployeeDialog from "./ViewAsEmployeeDialog";

interface ViewAsPickerProps {
  compact?: boolean;
  fullWidth?: boolean;
  dark?: boolean;
}

export default function ViewAsPicker({
  compact = false,
  fullWidth = false,
  dark = false,
}: ViewAsPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {compact ? (
        <Tooltip title={he.viewAsEmployee}>
          <IconButton color="primary" aria-label={he.viewAsEmployee} onClick={() => setOpen(true)}>
            <VisibilityOutlinedIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          fullWidth={fullWidth}
          type="button"
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={() => setOpen(true)}
          sx={{
            mb: fullWidth ? 1 : 0,
            ...(dark
              ? {
                  color: alpha("#fff", 0.85),
                  borderColor: alpha("#fff", 0.18),
                  "&:hover": { borderColor: "#fff", bgcolor: alpha("#fff", 0.08) },
                }
              : {}),
          }}
        >
          {he.viewAsEmployee}
        </Button>
      )}
      <ViewAsEmployeeDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

