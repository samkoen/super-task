import { useMemo, useState } from "react";
import { Box, ButtonBase, Dialog, Typography } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FlowGuideSheet from "../../../taskflow/FlowGuideSheet";
import TaskCardStack from "../../../taskflow/TaskCardStack";
import TaskFlowHeader from "../../../taskflow/TaskFlowHeader";
import { he } from "../../../../i18n/he";
import { flowColor, flowRadius, flowScreenBackground, flowText } from "../../../../styles/flowTokens";
import type { CompletionRequirement } from "../../../../utils/completionMedia";
import { emptySlotStates } from "../../../../utils/slotUploadState";
import { todayAt } from "../../../../utils/studioRequirements";
import { STUDIO_MAX_WIDTH } from "./studioUi";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  dueTime: string;
  requirements: CompletionRequirement[];
  employeeName?: string | null;
  photoUrl?: string | null;
};

const noop = () => undefined;

/** Bandeau collé en haut : rappelle qu'on regarde un aperçu et ramène à l'édition. */
function PreviewBanner({ onClose }: { onClose: () => void }) {
  return (
    <Box sx={{ position: "sticky", top: 0, zIndex: 20, px: "16px", pt: "calc(10px + env(safe-area-inset-top, 0px))", pb: "6px" }}>
      <Box
        sx={{
          maxWidth: STUDIO_MAX_WIDTH - 32,
          mx: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pl: "6px",
          pr: "14px",
          height: 48,
          borderRadius: `${flowRadius.full}px`,
          bgcolor: flowColor.inverse,
          color: flowColor.neutral0,
          boxShadow: "0px 6px 18px rgba(13,20,48,0.25)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ ...flowText.label, color: flowColor.neutral0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {he.studioPreviewBanner}
          </Typography>
        </Box>
        <ButtonBase
          data-testid="studio-preview-close"
          onClick={onClose}
          sx={{ flexShrink: 0, height: 36, px: "14px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral0, color: flowColor.neutral900, ...flowText.label }}
        >
          {he.studioPreviewClose}
        </ButtonBase>
      </Box>
    </Box>
  );
}

/**
 * « תצוגת עובד » : l'écran oved réel (en-tête + pile de cartes du FLOW 1) rempli avec le brouillon,
 * sans caméra ni envoi. Le lien « דוגמא לצילום נכון » ouvre la vraie feuille « איך מצלמים ».
 */
export default function StudioPreview({ open, onClose, title, dueTime, requirements, employeeName, photoUrl }: Props) {
  const [guideIndex, setGuideIndex] = useState<number | null>(null);
  const states = useMemo(() => emptySlotStates(requirements), [requirements]);
  return (
    <Dialog open={open} onClose={onClose} fullScreen dir="rtl" PaperProps={{ sx: { background: flowScreenBackground } }} data-testid="studio-preview-dialog">
      <PreviewBanner onClose={onClose} />
      <Box sx={{ width: "100%", maxWidth: STUDIO_MAX_WIDTH, mx: "auto", pb: "40px" }}>
        <TaskFlowHeader
          title={title.trim() || he.studioTitlePlaceholder}
          dueAt={todayAt(dueTime)}
          employeeName={employeeName || he.studioPreviewEmployee}
          photoUrl={photoUrl}
          onBack={onClose}
          onOpenChat={noop}
        />
        <Box sx={{ px: "24px" }}>
          {requirements.length ? (
            <TaskCardStack
              requirements={requirements}
              states={states}
              disabled
              onCapture={noop}
              onSendText={noop}
              onOpenGuide={setGuideIndex}
            />
          ) : (
            <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "center", mt: 4 }}>
              {he.studioEmptyHint}
            </Typography>
          )}
        </Box>
      </Box>
      <FlowGuideSheet
        req={guideIndex !== null ? requirements[guideIndex] ?? null : null}
        index={guideIndex ?? 0}
        onClose={() => setGuideIndex(null)}
      />
    </Dialog>
  );
}
