import { AppBar, Button, Toolbar, Typography, alpha } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_INK, EMPLOYEE_TOUCH_MIN } from "../../styles/employeeUi";
import { systemTopInsetCss } from "../../utils/systemInsets";

interface FullscreenBackAppBarProps {
  title: string;
  onBack: () => void;
}

/** Paper du dialog chat : barre חזרה toujours visible, le fil défile en dessous. */
export const fullscreenChatDialogPaperSx = {
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};

/** Contenu sous la barre : occupe le reste sans pousser חזרה hors écran. */
export const fullscreenChatBodySx = {
  p: 2,
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};

/** Barre chat plein écran : חזרה visible sous la barre statut Samsung. */
export default function FullscreenBackAppBar({ title, onBack }: FullscreenBackAppBarProps) {
  return (
    <AppBar
      color="inherit"
      elevation={1}
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (t) => t.zIndex.appBar,
        flexShrink: 0,
        pt: systemTopInsetCss(),
      }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: 68 }}>
        <Button
          type="button"
          onClick={onBack}
          startIcon={<ArrowForwardIcon />}
          sx={{
            minHeight: EMPLOYEE_TOUCH_MIN - 8,
            px: 2,
            borderRadius: "14px",
            fontWeight: 800,
            fontSize: "1.05rem",
            flexShrink: 0,
            color: EMPLOYEE_BRAND,
            bgcolor: alpha(EMPLOYEE_BRAND, 0.1),
            "&:hover": { bgcolor: alpha(EMPLOYEE_BRAND, 0.18) },
          }}
        >
          {he.goBack}
        </Button>
        <Typography
          component="h1"
          noWrap
          sx={{ flex: 1, minWidth: 0, fontSize: "1.2rem", fontWeight: 800, color: EMPLOYEE_INK }}
        >
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
