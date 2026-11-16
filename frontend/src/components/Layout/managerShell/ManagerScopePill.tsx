import { Box, ButtonBase } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";

type Props = {
  label: string;
  /** Vrai quand un snif est choisi : on propose le retour « חזרה לכל הרשת ». */
  inBranch: boolean;
  onOpen: () => void;
  onBackToNetwork: () => void;
};

const pillSx = {
  height: 40,
  px: "14px",
  gap: "4px",
  borderRadius: `${flowRadius.full}px`,
  ...flowText.button,
} as const;

/**
 * Pastille de périmètre du menahel reshet dans l'en-tête (« כל הרשת ▾ » ou « סניף חיפה ▾ »),
 * valable pour les 4 onglets ; un snif choisi ajoute le retour vers toute la reshet.
 */
export default function ManagerScopePill({ label, inBranch, onOpen, onBackToNetwork }: Props) {
  return (
    <Box data-testid="manager-scope-bar" sx={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <ButtonBase
        data-testid="manager-scope-pill"
        aria-label={`${he.managerHomeScopeLabel}: ${label}`}
        aria-haspopup="dialog"
        onClick={onOpen}
        sx={{ ...pillSx, bgcolor: flowColor.neutral900, color: flowColor.neutral0 }}
      >
        {label}
        <ExpandMoreRoundedIcon fontSize="small" />
      </ButtonBase>
      {inBranch ? (
        <ButtonBase
          data-testid="manager-scope-network"
          onClick={onBackToNetwork}
          sx={{ ...pillSx, bgcolor: flowColor.neutral0, color: flowColor.navy800 }}
        >
          {he.managerScopeBackToNetwork}
        </ButtonBase>
      ) : null}
    </Box>
  );
}
