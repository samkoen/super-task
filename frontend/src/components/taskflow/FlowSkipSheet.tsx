import { useEffect, useMemo, useState } from "react";
import { Box, ButtonBase, Drawer, InputBase, Typography } from "@mui/material";
import closeIcon from "../../assets/flow1/icon-x.svg";
import micIcon from "../../assets/flow1/icon-mic.svg";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSize, flowText } from "../../styles/flowTokens";
import type { CompletionRequirement, SkipReasonCode } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import { blobToFile } from "../../utils/mediaCapture";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";
import { emptySkipDraft, isSkipDraftValid, SKIP_REASON_CODES, SKIP_TEXT_MAX, skipReasonLabel, type SkipDraft } from "../../utils/slotSkip";

type Props = {
  /** Carte à déclarer « לא ניתן לצלם » ; null = fermé. */
  req: CompletionRequirement | null;
  index: number;
  onClose: () => void;
  onConfirm: (index: number, draft: SkipDraft) => void;
};

const BUTTON_SX = { height: 56, borderRadius: `${flowRadius.sm}px`, ...flowText.button, fontSize: 18, fontWeight: 700 } as const;

function audioFile(blob: Blob): File {
  return blobToFile(blob, `skip-audio-${Date.now()}.webm`, blob.type || "audio/webm");
}

/** Enregistrement de l'explication vocale : un seul fichier gardé, envoyé au serveur avec le récap. */
function useSkipVoice() {
  const recorder = useAudioRecorder();
  const { reset, recording, stopAndWait, start } = recorder;
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => () => reset(), [reset]);

  const toggle = async () => {
    if (recording) {
      const blob = await stopAndWait();
      if (blob) setFile(audioFile(blob));
      return;
    }
    setFile(null);
    await start();
  };
  /** Appelé au clic sur « דיווח והמשך » : un enregistrement encore ouvert est arrêté et gardé. */
  const finish = async (): Promise<File | null> => {
    if (!recording) return file;
    const blob = await stopAndWait();
    return blob ? audioFile(blob) : file;
  };
  const remove = () => {
    setFile(null);
    reset();
  };
  return { recorder, file, toggle, finish, remove };
}

function ReasonChips({ value, onChange }: { value: SkipReasonCode | null; onChange: (code: SkipReasonCode) => void }) {
  return (
    <Box role="group" aria-label={he.flowSkipSheetTitle} sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {SKIP_REASON_CODES.map((code) => {
        const selected = value === code;
        return (
          <ButtonBase
            key={code}
            data-testid={`flow-skip-reason-${code}`}
            aria-pressed={selected}
            onClick={() => onChange(code)}
            sx={{
              height: 40,
              px: "16px",
              borderRadius: `${flowRadius.full}px`,
              border: `1px solid ${selected ? flowColor.neutral900 : flowColor.line}`,
              bgcolor: selected ? flowColor.neutral900 : flowColor.neutral0,
              color: selected ? flowColor.neutral0 : flowColor.neutral900,
              ...flowText.button,
            }}
          >
            {skipReasonLabel(code)}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function AudioPreview({ file }: { file: File }) {
  const url = useMemo(() => (typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  if (!url) return null;
  return <Box component="audio" controls src={url} data-testid="flow-skip-audio" sx={{ width: "100%", height: 36 }} />;
}

type Voice = ReturnType<typeof useSkipVoice>;

function VoiceStatus({ voice }: { voice: Voice }) {
  const { recorder, file } = voice;
  if (recorder.recording) {
    return <Typography data-testid="flow-skip-recording" sx={{ ...flowText.label, color: flowColor.neutral900 }}>{he.flowSkipRecording(recorder.elapsedSeconds)}</Typography>;
  }
  if (recorder.error) {
    return <Typography role="alert" data-testid="flow-skip-record-error" sx={{ ...flowText.label, color: flowColor.neutral900 }}>{he.flowSkipRecordFailed}</Typography>;
  }
  if (file) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        <Typography data-testid="flow-skip-recorded" sx={{ ...flowText.label, color: flowColor.green700 }}>{he.flowSkipRecorded}</Typography>
        <AudioPreview file={file} />
      </Box>
    );
  }
  return null;
}

/** Figma 05ד : « הקלטה קולית » puis le micro rond noir, en bas à gauche du champ. */
function MicButton({ voice }: { voice: Voice }) {
  const recording = voice.recorder.recording;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
      <Typography aria-hidden sx={{ ...flowText.label, color: flowColor.alphaNeutral900_66 }}>
        {recording ? he.flowSkipRecordStop : he.flowSkipRecord}
      </Typography>
      <ButtonBase
        data-testid="flow-skip-mic"
        aria-label={recording ? he.flowSkipRecordStop : he.flowSkipRecord}
        aria-pressed={recording}
        onClick={() => void voice.toggle()}
        sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", bgcolor: recording ? flowColor.rec : flowColor.neutral900 }}
      >
        <Box component="img" src={micIcon} alt="" sx={{ width: 18, height: 18, display: "block" }} />
      </ButtonBase>
    </Box>
  );
}

/** Champ gris (05ד) ; « אחר » (05ה) : bord foncé et pirus obligatoire annoncé dans le placeholder. */
function ExplanationBox({ text, onText, voice, required }: { text: string; onText: (value: string) => void; voice: Voice; required: boolean }) {
  const placeholder = required ? he.flowSkipTextPlaceholderOther : he.flowSkipTextPlaceholder;
  return (
    <Box
      data-testid="flow-skip-explanation"
      data-required={required ? "true" : "false"}
      sx={{ p: "14px 16px 12px", gap: "8px", display: "flex", flexDirection: "column", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral100, border: `1.5px solid ${required ? flowColor.neutral900 : "transparent"}` }}
    >
      <InputBase
        multiline
        minRows={2}
        maxRows={4}
        value={text}
        onChange={(event) => onText(event.target.value)}
        placeholder={placeholder}
        inputProps={{ "data-testid": "flow-skip-text", maxLength: SKIP_TEXT_MAX, "aria-label": placeholder }}
        sx={{ ...flowText.body, color: flowColor.neutral900, "& textarea::placeholder": { color: flowColor.alphaNeutral900_60, opacity: 1 } }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <MicButton voice={voice} />
        <VoiceStatus voice={voice} />
        {voice.file && !voice.recorder.recording ? (
          <ButtonBase data-testid="flow-skip-audio-delete" onClick={voice.remove} sx={{ ...flowText.label, px: "8px", height: 32, color: flowColor.alphaNeutral900_66 }}>
            {he.flowSkipRecordDelete}
          </ButtonBase>
        ) : null}
      </Box>
    </Box>
  );
}

function SheetHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
      <Box sx={{ flex: 1 }}>
        <Typography component="h2" data-testid="flow-skip-heading" sx={{ ...flowText.h2, color: flowColor.navy800, textAlign: "right" }}>
          {title}
        </Typography>
        <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "right" }}>{subtitle}</Typography>
      </Box>
      <ButtonBase
        data-testid="flow-skip-x"
        aria-label={he.flowSkipClose}
        onClick={onClose}
        sx={{ width: 48, height: 48, borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral0 }}
      >
        <Box component="img" src={closeIcon} alt="" sx={{ width: 24, height: 24 }} />
      </ButtonBase>
    </Box>
  );
}

/** Contenu monté seulement quand la feuille est ouverte : brouillon et enregistreur repartent de zéro à chaque ouverture. */
function SheetBody({ req, index, onClose, onConfirm }: Props & { req: CompletionRequirement }) {
  const [draft, setDraft] = useState<SkipDraft>(emptySkipDraft);
  const voice = useSkipVoice();
  const valid = isSkipDraftValid({ ...draft, audio: voice.file }) && !(draft.reasonCode === "other" && voice.recorder.recording);
  // « אחר » sans texte ni vocal : on dit tout de suite pourquoi « דיווח והמשך » reste gris.
  const otherNeedsDetails =
    draft.reasonCode === "other" && !draft.reasonText.trim() && !voice.file && !voice.recorder.recording;

  const confirm = async () => {
    const audio = await voice.finish();
    const next = { ...draft, audio };
    if (isSkipDraftValid(next)) onConfirm(index, next);
  };
  return (
    <>
      <SheetHeader title={he.flowSkipSheetTitle} subtitle={he.flowSkipSheetSubtitle(slotDisplayTitle(req, index))} onClose={onClose} />
      <ReasonChips value={draft.reasonCode} onChange={(reasonCode) => setDraft((d) => ({ ...d, reasonCode }))} />
      {otherNeedsDetails ? (
        <Typography role="alert" data-testid="flow-skip-other-needs-details" sx={{ ...flowText.label, fontWeight: 700, color: flowColor.rec, textAlign: "right" }}>
          {he.flowSkipOtherNeedsDetails}
        </Typography>
      ) : null}
      <ExplanationBox text={draft.reasonText} onText={(reasonText) => setDraft((d) => ({ ...d, reasonText }))} voice={voice} required={draft.reasonCode === "other"} />
      <ButtonBase
        data-testid="flow-skip-confirm"
        disabled={!valid}
        onClick={() => void confirm()}
        sx={{ ...BUTTON_SX, bgcolor: flowColor.neutral900, color: flowColor.neutral0, "&.Mui-disabled": { bgcolor: flowColor.alphaNeutral900_35, color: flowColor.neutral0 } }}
      >
        {he.flowSkipConfirm}
      </ButtonBase>
      <ButtonBase data-testid="flow-skip-later" onClick={onClose} sx={{ ...BUTTON_SX, height: 40, fontSize: 15, fontWeight: 600, color: flowColor.neutral900 }}>
        {he.flowSkipLater}
      </ButtonBase>
    </>
  );
}

/**
 * Écran 05ב : bottom sheet « מה מונע את הצילום? ». L'oved choisit une raison, peut l'écrire et/ou l'enregistrer
 * en vocal ; « אחר » exige un texte ou un vocal. « אצלם אחר כך » referme sans rien déclarer.
 */
export default function FlowSkipSheet({ req, index, onClose, onConfirm }: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={Boolean(req)}
      onClose={onClose}
      // L'écran de tâche est un Dialog plein écran (z-index « modal ») : un Drawer s'ouvrirait derrière.
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      PaperProps={{
        dir: "rtl",
        "aria-label": he.flowSkipSheetTitle,
        sx: {
          maxWidth: 393,
          mx: "auto",
          px: `${flowSize.contentPaddingX}px`,
          pt: "12px",
          pb: withSystemBottomInsetCss("24px"),
          gap: "16px",
          display: "flex",
          flexDirection: "column",
          bgcolor: flowColor.neutral0,
          borderRadius: `${flowRadius.xl2}px ${flowRadius.xl2}px 0 0`,
        },
      }}
    >
      <Box aria-hidden sx={{ alignSelf: "center", width: 40, height: 5, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.line }} />
      {req ? <SheetBody req={req} index={index} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Drawer>
  );
}
