import type { ReactNode } from "react";
import { Box, ButtonBase, Drawer, Typography } from "@mui/material";
import closeIcon from "../../../../assets/flow1/icon-x.svg";
import { he } from "../../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../../styles/flowTokens";
import { studioSheetPaperSx } from "./studioUi";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
};

/** Feuille du bas du FLOW (poignée, titre H2, croix) : même dessin que l'écran 02 « איך מצלמים ». */
export default function StudioSheet({ open, title, subtitle, onClose, children, testId }: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      // Le studio est un Dialog plein écran : sans ce z-index la feuille s'ouvrirait derrière lui.
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      PaperProps={{ dir: "rtl", "aria-label": title, "data-testid": testId, sx: studioSheetPaperSx } as object}
    >
      <Box aria-hidden sx={{ alignSelf: "center", width: 40, height: 5, flexShrink: 0, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.line }} />
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ ...flowText.h2, color: flowColor.neutral900 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, mt: "4px" }}>{subtitle}</Typography>
          ) : null}
        </Box>
        <ButtonBase
          aria-label={he.close}
          onClick={onClose}
          sx={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", bgcolor: flowColor.neutral100 }}
        >
          <Box component="img" src={closeIcon} alt="" sx={{ width: 22, height: 22 }} />
        </ButtonBase>
      </Box>
      {children}
    </Drawer>
  );
}
