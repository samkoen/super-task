import { useEffect, useState, type ReactNode } from "react";
import { Box, ButtonBase, CircularProgress, InputBase, Typography } from "@mui/material";
import chatIcon from "../../assets/flow1/btn-chat.svg";
import FlowPageHeader from "../taskflow/FlowPageHeader";
import { CheckRow } from "../taskflow/FlowReview";
import StudioSheet from "../tasks/fixed/studio/StudioSheet";
import { studioFieldSx, studioPrimarySx, studioSecondarySx } from "../tasks/fixed/studio/studioUi";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import type { ReviewCheck } from "../../utils/flowReview";

/** Carte blanche (rayon 28) des blocs de la revue. */
export const reviewCardSx = {
  bgcolor: flowColor.neutral0,
  borderRadius: `${flowRadius.xl2}px`,
  p: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
} as const;

export function ReviewCard({ title, children, testId }: { title?: string; children: ReactNode; testId?: string }) {
  return (
    <Box data-testid={testId} sx={reviewCardSx}>
      {title ? <Typography component="h2" sx={{ ...flowText.button, color: flowColor.navy800 }}>{title}</Typography> : null}
      {children}
    </Box>
  );
}

type HeaderProps = { title: string; subtitle: string; index: number; total: number; onBack: () => void; onChat: () => void };

/** Figma : titre + retour, « דני · מחסן · נשלח 06:47 », puis compteur « 2 מתוך 5 » et bouton rond de chat. */
export function ReviewHeader({ title, subtitle, index, total, onBack, onChat }: HeaderProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <FlowPageHeader title={title} titleColor={flowColor.neutral900} onBack={onBack} />
      {subtitle ? <Typography data-testid="review-subtitle" sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, mt: "-8px" }}>{subtitle}</Typography> : null}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography data-testid="review-queue" sx={{ ...flowText.label, px: "12px", py: "6px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral0, color: flowColor.neutral900 }}>
          {he.managerReviewQueue(index, total)}
        </Typography>
        <ButtonBase aria-label={he.managerReviewOpenChat} onClick={onChat} sx={{ width: 56, height: 56, borderRadius: "50%" }}>
          <Box component="img" src={chatIcon} alt="" sx={{ width: 56, height: 56, display: "block" }} />
        </ButtonBase>
      </Box>
    </Box>
  );
}

export function ReviewChecksCard({ checks }: { checks: ReviewCheck[] }) {
  if (!checks.length) return null;
  return (
    <ReviewCard title={he.managerReviewChecksTitle} testId="review-checks">
      {checks.map((check) => <CheckRow key={check.id} check={check} />)}
    </ReviewCard>
  );
}

type ActionsProps = { primaryLabel: string; saving: boolean; primaryDisabled: boolean; onPrimary: () => void; onReturn?: () => void; returnDisabled?: boolean };

/** « אישור » noir pleine largeur, « להחזיר לעובד » en secondaire (absent quand les sous-tâches décident). */
export function ReviewActions({ primaryLabel, saving, primaryDisabled, onPrimary, onReturn, returnDisabled }: ActionsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <ButtonBase data-testid="review-approve" disabled={saving || primaryDisabled} onClick={onPrimary} sx={studioPrimarySx}>
        {saving ? <CircularProgress size={22} sx={{ color: flowColor.neutral0 }} /> : primaryLabel}
      </ButtonBase>
      {onReturn ? (
        <ButtonBase data-testid="review-return" disabled={saving || returnDisabled} onClick={onReturn} sx={{ ...studioSecondarySx, "&.Mui-disabled": { opacity: 0.45 } }}>
          {he.managerReviewReturn}
        </ButtonBase>
      ) : null}
    </Box>
  );
}

type ReturnSheetProps = { open: boolean; saving: boolean; marksCount: number; onClose: () => void; onSend: (note: string) => void };

/** Feuille « מה צריך לתקן? » : remarque libre, envoyée avec les photos annotées. */
export function ReviewReturnSheet({ open, saving, marksCount, onClose, onSend }: ReturnSheetProps) {
  const [note, setNote] = useState("");
  useEffect(() => { if (open) setNote(""); }, [open]);
  return (
    <StudioSheet open={open} title={he.managerReviewReturnTitle} subtitle={he.managerReviewReturnHint} onClose={onClose} testId="review-return-sheet">
      <Box sx={{ ...studioFieldSx, "& .MuiInputBase-root": { width: "100%", p: "14px", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral100 } }}>
        <InputBase
          multiline
          minRows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={he.managerReviewReturnPlaceholder}
          inputProps={{ "aria-label": he.taskReopenNote }}
        />
      </Box>
      {marksCount > 0 ? <Typography sx={{ ...flowText.body, color: flowColor.navy800 }}>{he.reviewMarkedPhotoCount(marksCount)}</Typography> : null}
      <ButtonBase data-testid="review-return-send" disabled={saving} onClick={() => onSend(note)} sx={studioPrimarySx}>
        {saving ? <CircularProgress size={22} sx={{ color: flowColor.neutral0 }} /> : he.managerReviewReturnSend}
      </ButtonBase>
    </StudioSheet>
  );
}

export function NextCaption({ title }: { title: string | null }) {
  if (!title) return null;
  return (
    <Typography data-testid="review-next" sx={{ ...flowText.label, textAlign: "center", color: flowColor.alphaNeutral900_60 }}>
      {he.managerReviewNext(title)}
    </Typography>
  );
}
