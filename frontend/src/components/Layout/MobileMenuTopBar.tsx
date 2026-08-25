import type { ReactNode } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import { Box, Fab } from "@mui/material";
import { he } from "../../i18n/he";
import BackButton from "../ui/BackButton";

interface MobileMenuTopBarProps {
  showBack: boolean;
  forceVisible?: boolean;
  onOpenMenu: () => void;
  trailing?: ReactNode;
}

/** Barre sticky : חזרה + menu — évite que le rond vert recouvre le contenu. */
export default function MobileMenuTopBar({
  showBack,
  forceVisible = false,
  onOpenMenu,
  trailing,
}: MobileMenuTopBarProps) {
  return (
    <Box
      sx={{
        display: forceVisible ? "flex" : { xs: "flex", sm: "none" },
        position: "sticky",
        top: 0,
        zIndex: (t) => t.zIndex.appBar,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        minHeight: 56,
        mb: 1.5,
        mx: { xs: -0.5, sm: 0 },
        px: 0.5,
        pt: "max(8px, env(safe-area-inset-top, 0px))",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1, display: "flex", justifyContent: "flex-start" }}>
        {showBack ? <BackButton sx={{ mb: 0 }} /> : null}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {trailing}
        <Fab
          size="small"
          color="primary"
          aria-label={he.mainMenu}
          onClick={onOpenMenu}
          sx={{
            flexShrink: 0,
            transform: "translateZ(0)",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <MenuIcon />
        </Fab>
      </Box>
    </Box>
  );
}
