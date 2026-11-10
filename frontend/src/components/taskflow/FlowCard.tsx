import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, ButtonBase, TextField, Typography } from "@mui/material";
import messageIcon from "../../assets/flow1/icon-message-circle.svg";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import MicNoneRoundedIcon from "@mui/icons-material/MicNoneRounded";
import MediaCaptureActions, { type MediaKind } from "../media/MediaCaptureActions";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { he } from "../../i18n/he";
import {
  flowColor,
  flowRadius,
  flowSize,
  flowText,
  flowToneColor,
  type FlowTone,
} from "../../styles/flowTokens";
import { flowMaskSx, flowShape } from "../../styles/flowShapes";
import { guideFromRequirement } from "../../utils/captureGuide";
import { MAX_MESSAGE_TEXT, type CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import { hasGuide, primaryActionLabel, stepNumber } from "../../utils/flowStack";
import type { SlotUiState } from "../../utils/slotUploadState";

export type FlowCardProps = {
  req: CompletionRequirement;
  index: number;
  state: SlotUiState;
  tone: FlowTone;
  disabled?: boolean;
  /** « הושלמו N מתוך M » dans la caméra. */
  progress?: { done: number; total: number };
  onCapture: (file: File, kind: MediaKind, durationSeconds?: number) => void;
  onSendText: (text: string) => void;
  onOpenGuide: () => void;
  onChat: () => void;
  /** Change à chaque « צילום מחדש » : rouvre la caméra pour cette carte. */
  autoCaptureNonce?: number;
};

const smallButtonSx = {
  height: flowSize.buttonSmall,
  px: "11px",
  borderRadius: `${flowRadius.sm}px`,
  ...flowText.button,
} as const;

function ExampleImage({ req }: { req: CompletionRequirement }) {
  const media = useResolvedMediaSrc(req.example_url || null, false);
  const Fallback = req.kind === "photo" ? PhotoCameraOutlinedIcon : req.kind === "audio" ? MicNoneRoundedIcon : VideocamOutlinedIcon;
  if (!media.src || media.failed) {
    return <Fallback aria-hidden data-testid="flow-illustration-fallback" sx={{ fontSize: 64, color: flowColor.alphaNeutral900_60 }} />;
  }
  return (
    <Box
      component="img"
      data-testid="flow-illustration"
      src={media.src}
      alt=""
      onError={media.onError}
      sx={{
        width: flowSize.illustrationImageWidth,
        height: flowSize.illustrationImageHeight,
        maxWidth: "100%",
        objectFit: "contain",
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
}

function MessageField({ disabled, value, onChange }: { disabled?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={he.flowMessagePlaceholder}
      multiline
      minRows={5}
      fullWidth
      inputProps={{ maxLength: MAX_MESSAGE_TEXT, "aria-label": he.flowActionMessage }}
      sx={{ "& .MuiOutlinedInput-root": { fontFamily: flowText.body.fontFamily, fontSize: 15, borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral0 } }}
    />
  );
}

function IllustrationArea({ tone, children }: { tone: FlowTone; children: ReactNode }) {
  return (
    <Box
      data-testid="flow-illustration-area"
      sx={{
        height: flowSize.illustrationHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: `${flowRadius.md}px`,
        bgcolor: tone === "white" ? flowColor.neutral100 : flowColor.alphaNeutral1000_10,
      }}
    >
      {children}
    </Box>
  );
}

function PrimaryButton({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <ButtonBase
      data-testid="flow-primary"
      onClick={onClick}
      disabled={disabled}
      sx={{ ...smallButtonSx, minWidth: 136, bgcolor: flowColor.neutral900, color: flowColor.neutral0, "&.Mui-disabled": { opacity: 0.5 } }}
    >
      {label}
    </ButtonBase>
  );
}

/** Lien « דוגמא לצילום נכון » : toujours présent, grisé tant que le menahel n'a rien défini. */
function ExampleLink({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      data-testid="flow-guide"
      disabled={!enabled}
      onClick={onClick}
      sx={{ ...smallButtonSx, color: flowColor.neutral900, "&.Mui-disabled": { opacity: 0.35 } }}
    >
      {he.flowExampleLink}
    </ButtonBase>
  );
}

function CaptureButton({ req, index, label, disabled, autoCaptureNonce, progress, onCapture }: {
  req: CompletionRequirement;
  index: number;
  label: string;
  progress?: { done: number; total: number };
  disabled?: boolean;
  autoCaptureNonce?: number;
  onCapture: FlowCardProps["onCapture"];
}) {
  const openRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (autoCaptureNonce) openRef.current?.();
  }, [autoCaptureNonce]);
  const kind = req.kind as MediaKind;
  return (
    <MediaCaptureActions
      photoAdded={false}
      videoAdded={false}
      audioAdded={false}
      uploadingKind={null}
      disabled={disabled}
      allowedKinds={[kind]}
      minVideoSeconds={kind === "video" ? req.min_seconds ?? null : null}
      guide={{ ...guideFromRequirement(req, index), progress }}
      deferVideoReview
      onCapture={(file, captured, meta) => onCapture(file, captured, meta?.durationSeconds)}
      trigger={(open, ui) => {
        openRef.current = open;
        return <PrimaryButton label={label} onClick={open} disabled={ui.disabled || disabled} />;
      }}
    />
  );
}

function CardActions(props: FlowCardProps & { text: string }) {
  const { req, index, disabled, text, autoCaptureNonce } = props;
  return (
    <Box sx={{ display: "flex", direction: "ltr", alignItems: "center", justifyContent: "flex-end", gap: "16px" }}>
      {req.kind === "message" ? (
        <PrimaryButton label={he.flowMessageSend} disabled={disabled || !text.trim()} onClick={() => props.onSendText(text.trim())} />
      ) : (
        <CaptureButton
          req={req}
          index={index}
          label={primaryActionLabel(req.kind)}
          disabled={disabled}
          autoCaptureNonce={autoCaptureNonce}
          progress={props.progress}
          onCapture={props.onCapture}
        />
      )}
      <ExampleLink enabled={hasGuide(req)} onClick={props.onOpenGuide} />
    </Box>
  );
}

function CardHeader({ props }: { props: FlowCardProps }) {
  const { req, index, state } = props;
  const remark = state.remark?.trim();
  return (
    <>
      <Box sx={{ display: "flex", direction: "ltr", alignItems: "center", justifyContent: "space-between" }}>
        <ButtonBase
          aria-label={he.flowCardChat}
          data-testid="flow-card-chat"
          onClick={props.onChat}
          sx={{ p: "8px", m: "-8px", borderRadius: "50%" }}
        >
          <Box component="img" src={messageIcon} alt="" sx={{ width: 19, height: 19, display: "block" }} />
        </ButtonBase>
        <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_66 }}>{stepNumber(index)}</Typography>
      </Box>
      <Typography component="h2" sx={{ ...flowText.h2, mt: "16px", color: flowColor.neutral900, textAlign: "right", overflowWrap: "anywhere" }}>
        {slotDisplayTitle(req, index)}
      </Typography>
      {req.hint?.trim() ? (
        <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "right", overflowWrap: "anywhere" }}>
          {req.hint.trim()}
        </Typography>
      ) : null}
      {remark || state.status === "failed" ? (
        <Typography data-testid="flow-card-remark" sx={{ ...flowText.label, mt: 0.5, color: "#b3261e", textAlign: "right" }}>
          {remark ? `${he.flowCardManagerRemark}: ${remark}` : state.error || ""}
        </Typography>
      ) : null}
    </>
  );
}

/** Carte active (345 × 422) : numéro, titre et consigne du menahel, image d'exemple, deux boutons. */
export default function FlowCard(props: FlowCardProps) {
  const { req, tone } = props;
  const [text, setText] = useState("");
  return (
    <Box
      component="section"
      data-testid="flow-card"
      data-tone={tone}
      data-index={props.index}
      sx={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: flowSize.cardWidth,
        minHeight: flowSize.cardHeight,
        px: `${flowSize.cardPadding}px`,
        pt: "29.385px",
        pb: "19px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxSizing: "border-box",
      }}
    >
      <Box
        aria-hidden
        data-testid="flow-card-shape"
        sx={{ position: "absolute", inset: "0.6% 0 0 0", zIndex: 0, bgcolor: flowToneColor[tone].card, ...flowMaskSx(flowShape.card) }}
      />
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <CardHeader props={props} />
      </Box>
      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "24px", mt: "auto" }}>
        <IllustrationArea tone={tone}>
          {req.kind === "message" ? (
            <MessageField disabled={props.disabled} value={text} onChange={setText} />
          ) : (
            <ExampleImage req={req} />
          )}
        </IllustrationArea>
        <CardActions {...props} text={text} />
      </Box>
    </Box>
  );
}
