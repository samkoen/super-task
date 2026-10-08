import type { ComponentProps } from "react";
import { DialogTitle, IconButton, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { he } from "../../i18n/he";
import { EMPLOYEE_TOUCH_MIN } from "../../styles/employeeUi";

interface AppDialogTitleProps extends Omit<ComponentProps<typeof DialogTitle>, "children" | "title"> {
  title: string;
  onClose: () => void;
  /** Bloque la fermeture pendant un envoi. */
  closeDisabled?: boolean;
}

/** Titre de fenêtre oved : gros titre + croix de 48 px toujours visible, même en plein écran. */
export default function AppDialogTitle({
  title,
  onClose,
  closeDisabled = false,
  sx,
  ...rest
}: AppDialogTitleProps) {
  return (
    <DialogTitle
      {...rest}
      sx={[
        { display: "flex", alignItems: "center", gap: 1, py: 1.5, paddingInlineEnd: 1 },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Typography component="span" variant="h6" fontWeight={800} sx={{ flex: 1, minWidth: 0 }}>
        {title}
      </Typography>
      <IconButton
        aria-label={he.close}
        onClick={onClose}
        disabled={closeDisabled}
        sx={{ width: EMPLOYEE_TOUCH_MIN - 8, height: EMPLOYEE_TOUCH_MIN - 8 }}
      >
        <CloseRoundedIcon />
      </IconButton>
    </DialogTitle>
  );
}
