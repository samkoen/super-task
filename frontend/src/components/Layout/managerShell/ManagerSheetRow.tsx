import type { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";

type Props = {
  label: string;
  hint?: string;
  icon: ReactNode;
  testId: string;
  onClick: () => void;
};

/** Ligne de sheet FLOW : pastille d'icône, libellé (et indice), chevron vers la gauche (RTL). */
export default function ManagerSheetRow({ label, hint, icon, testId, onClick }: Props) {
  return (
    <ButtonBase
      data-testid={testId}
      onClick={onClick}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        px: "12px",
        py: "10px",
        borderRadius: `${flowRadius.md}px`,
        bgcolor: flowColor.neutral100,
        textAlign: "right",
      }}
    >
      <Box
        aria-hidden
        sx={{ width: 40, height: 40, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: flowColor.neutral0, color: flowColor.navy800 }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ ...flowText.button, fontSize: 16, color: flowColor.neutral900 }}>{label}</Typography>
        {hint ? <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{hint}</Typography> : null}
      </Box>
      <ChevronLeftRoundedIcon sx={{ color: flowColor.neutral600, flexShrink: 0 }} />
    </ButtonBase>
  );
}
