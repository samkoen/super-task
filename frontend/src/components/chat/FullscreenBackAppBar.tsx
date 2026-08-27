import { AppBar, Button, Toolbar, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { he } from "../../i18n/he";
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
      <Toolbar sx={{ gap: 1, minHeight: 56 }}>
        <Button
          type="button"
          color="inherit"
          variant="outlined"
          onClick={onBack}
          startIcon={<ArrowForwardIcon />}
          sx={{ fontWeight: 700, flexShrink: 0 }}
        >
          {he.goBack}
        </Button>
        <Typography variant="h6" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
