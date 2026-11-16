import type { ReactNode } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import arrowLeftIcon from "../../../../assets/flow1/icon-arrow-left.svg";
import { he } from "../../../../i18n/he";
import { flowColor, flowSize, flowText } from "../../../../styles/flowTokens";
import { studioBareInputSx } from "./studioUi";
import { withSystemTopInsetCss } from "../../../../utils/systemInsets";

type Props = {
  kicker: string;
  title: string;
  onTitleChange?: (title: string) => void;
  /** « בשעה 6:30 · יומית » sous le titre. */
  scheduleLine: string;
  onBack: () => void;
  onPreview?: () => void;
  onMore?: () => void;
  disabled?: boolean;
};

/** Bouton rond 56 du Figma (fond blanc). */
function RoundButton({ label, testId, onClick, children }: { label: string; testId: string; onClick: () => void; children: ReactNode }) {
  return (
    <ButtonBase
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={onClick}
      sx={{ flexShrink: 0, width: flowSize.roundButton, height: flowSize.roundButton, borderRadius: "50%", bgcolor: flowColor.neutral0 }}
    >
      {children}
    </ButtonBase>
  );
}

/**
 * En-tête du studio, calqué sur l'en-tête oved (« שלום אבי » → titre → « בשעה 6:30 » → barre de boutons ronds).
 * Le titre se modifie directement : c'est le titre que l'oved lira.
 */
export default function StudioHeader({ kicker, title, onTitleChange, scheduleLine, onBack, onPreview, onMore, disabled }: Props) {
  return (
    <Box component="header" data-testid="studio-header" sx={{ px: `${flowSize.contentPaddingX}px`, pt: withSystemTopInsetCss("8px") }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "12px" }}>
        <Typography sx={{ ...flowText.bodyLarge, color: flowColor.alphaNeutral1000_53 }}>{kicker}</Typography>
        <Box>
          {onTitleChange ? (
            <InputBase
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={he.studioTitlePlaceholder}
              disabled={disabled}
              multiline
              maxRows={3}
              inputProps={{ "aria-label": he.taskTitle, dir: "auto", maxLength: 200 }}
              sx={{ ...studioBareInputSx, ...flowText.h1, color: flowColor.neutral900 }}
            />
          ) : (
            <Typography component="h1" sx={{ ...flowText.h1, color: flowColor.neutral900, overflowWrap: "anywhere" }}>
              {title}
            </Typography>
          )}
          {scheduleLine ? (
            <Typography data-testid="studio-schedule-line" sx={{ ...flowText.bodyLarge, color: flowColor.alphaBlack800_72 }}>
              {scheduleLine}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Box sx={{ direction: "ltr", display: "flex", alignItems: "center", justifyContent: "space-between", pt: "16px", pb: "12px" }}>
        <RoundButton label={he.flowBack} testId="studio-back" onClick={onBack}>
          <Box component="img" src={arrowLeftIcon} alt="" sx={{ width: 22, height: 22, display: "block" }} />
        </RoundButton>
        <Box sx={{ display: "flex", gap: "12px" }}>
          {onMore ? (
            <RoundButton label={he.studioMore} testId="studio-more" onClick={onMore}>
              <TuneRoundedIcon sx={{ fontSize: 22, color: flowColor.neutral600 }} />
            </RoundButton>
          ) : null}
          {onPreview ? (
            <ButtonBase
              data-testid="studio-preview"
              onClick={onPreview}
              sx={{ height: flowSize.roundButton, px: "18px", gap: "8px", borderRadius: `${flowSize.roundButton}px`, bgcolor: flowColor.neutral0, color: flowColor.neutral900, ...flowText.button }}
            >
              {he.studioPreview}
              <VisibilityOutlinedIcon sx={{ fontSize: 22, color: flowColor.neutral600 }} />
            </ButtonBase>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
