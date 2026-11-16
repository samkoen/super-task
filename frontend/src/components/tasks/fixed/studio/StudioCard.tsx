import { useRef, useState, type ReactNode } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import dotsIcon from "../../../../assets/flow1/dots.svg";
import MediaCaptureActions from "../../../media/MediaCaptureActions";
import { useResolvedMediaSrc } from "../../../../hooks/useResolvedMediaSrc";
import { he } from "../../../../i18n/he";
import { flowMaskSx, flowShape } from "../../../../styles/flowShapes";
import { flowColor, flowRadius, flowSize, flowText, flowToneColor, type FlowTone } from "../../../../styles/flowTokens";
import {
  kindSkipsExample,
  MAX_SLOT_HINT,
  MAX_SLOT_TITLE,
  type CompletionRequirement,
} from "../../../../utils/completionMedia";
import { primaryActionLabel, stepNumber } from "../../../../utils/flowStack";
import { referenceFileKind } from "../../../../utils/referenceMediaFile";
import { KindIcon } from "./StudioStepSheets";
import { studioBareInputSx, studioSmallButtonSx } from "./studioUi";

export type StudioCardProps = {
  req: CompletionRequirement;
  index: number;
  tone: FlowTone;
  disabled?: boolean;
  onTitle: (title: string) => void;
  onHint: (hint: string) => void;
  onExample: (file: File) => void;
  onExampleClear: () => void;
  onOpenMenu: () => void;
  onOpenKind: () => void;
  onOpenGuide: () => void;
};

/** Petit bouton rond posé sur l'image d'exemple (צילום / גלריה / הסרה). */
function ImageTool({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <ButtonBase
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: flowColor.alphaNeutral0_80, boxShadow: "0 2px 6px rgba(13,20,48,0.15)" }}
    >
      {children}
    </ButtonBase>
  );
}

/** Sélecteur de fichier image caché ; `open` le déclenche. */
function useImagePicker(onPick: (file: File) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  const input = (
    <input
      ref={ref}
      type="file"
      hidden
      accept="image/*"
      data-testid="studio-example-input"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const ok = referenceFileKind(file) === "photo";
        setInvalid(!ok);
        if (ok) onPick(file);
      }}
    />
  );
  return { input, open: () => ref.current?.click(), invalid };
}

/** Prise de photo d'exemple avec la caméra de l'app (même écran que l'oved). */
function CameraTrigger({ disabled, onPick, render }: {
  disabled?: boolean;
  onPick: (file: File) => void;
  render: (open: () => void, disabled: boolean) => ReactNode;
}) {
  return (
    <MediaCaptureActions
      photoAdded={false}
      videoAdded={false}
      audioAdded={false}
      uploadingKind={null}
      disabled={disabled}
      allowedKinds={["photo"]}
      onCapture={(file) => onPick(file)}
      trigger={(open, ui) => render(open, ui.disabled || Boolean(disabled))}
    />
  );
}

function FilledExample({ props, src, onError }: { props: StudioCardProps; src: string; onError: () => void }) {
  const picker = useImagePicker(props.onExample);
  return (
    <>
      {picker.input}
      <Box
        component="img"
        data-testid="studio-example-image"
        src={src}
        alt=""
        onError={onError}
        sx={{
          width: flowSize.illustrationImageWidth,
          height: flowSize.illustrationImageHeight,
          maxWidth: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
      <Box sx={{ position: "absolute", top: 10, left: 10, display: "flex", gap: "8px" }}>
        <CameraTrigger
          disabled={props.disabled}
          onPick={props.onExample}
          render={(open, disabled) => (
            <ImageTool label={he.studioExampleCamera} onClick={open} disabled={disabled}>
              <PhotoCameraOutlinedIcon sx={{ fontSize: 18, color: flowColor.navy800 }} />
            </ImageTool>
          )}
        />
        <ImageTool label={he.studioExampleGallery} onClick={picker.open} disabled={props.disabled}>
          <CollectionsOutlinedIcon sx={{ fontSize: 18, color: flowColor.navy800 }} />
        </ImageTool>
        <ImageTool label={he.studioExampleRemove} onClick={props.onExampleClear} disabled={props.disabled}>
          <DeleteOutlineRoundedIcon sx={{ fontSize: 18, color: "#b3261e" }} />
        </ImageTool>
      </Box>
    </>
  );
}

function EmptyExample({ props }: { props: StudioCardProps }) {
  const picker = useImagePicker(props.onExample);
  const chip = { ...studioSmallButtonSx, height: 36, bgcolor: flowColor.neutral0, color: flowColor.neutral900, fontSize: 14 } as const;
  return (
    <Box
      data-testid="studio-example-empty"
      sx={{
        position: "absolute",
        inset: 8,
        borderRadius: `${flowRadius.sm}px`,
        border: `1.5px dashed ${flowColor.alphaNavy800_18}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        px: 2,
        textAlign: "center",
      }}
    >
      {picker.input}
      <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 40, color: flowColor.alphaNavy800_60 }} />
      <Typography sx={{ ...flowText.button, color: flowColor.navy800 }}>{he.studioExampleAdd}</Typography>
      <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{he.studioExampleAddHint}</Typography>
      <Box sx={{ display: "flex", gap: "8px", mt: "6px" }}>
        <CameraTrigger
          disabled={props.disabled}
          onPick={props.onExample}
          render={(open, disabled) => (
            <ButtonBase onClick={open} disabled={disabled} sx={chip}>
              <PhotoCameraOutlinedIcon sx={{ fontSize: 18 }} />
              {he.studioExampleCamera}
            </ButtonBase>
          )}
        />
        <ButtonBase onClick={picker.open} disabled={props.disabled} sx={chip}>
          <CollectionsOutlinedIcon sx={{ fontSize: 18 }} />
          {he.studioExampleGallery}
        </ButtonBase>
      </Box>
      {picker.invalid ? <Typography sx={{ ...flowText.label, color: "#b3261e" }}>{he.referencePhotoFileInvalid}</Typography> : null}
    </Box>
  );
}

/** Zone d'illustration (213 px) : l'image que le menahel donne, exactement là où l'oved la verra. */
function ExampleArea({ props }: { props: StudioCardProps }) {
  const { req, tone } = props;
  const media = useResolvedMediaSrc(req.example_url || null, false);
  const noExample = kindSkipsExample(req.kind);
  return (
    <Box
      data-testid="studio-illustration-area"
      sx={{
        position: "relative",
        height: flowSize.illustrationHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: `${flowRadius.md}px`,
        bgcolor: tone === "white" ? flowColor.neutral100 : flowColor.alphaNeutral1000_10,
      }}
    >
      {noExample ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", px: 2, textAlign: "center" }}>
          <KindIcon kind={req.kind} size={56} />
          <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{he.studioNoExampleForKind}</Typography>
        </Box>
      ) : media.src && !media.failed ? (
        <FilledExample props={props} src={media.src} onError={media.onError} />
      ) : (
        <EmptyExample props={props} />
      )}
    </Box>
  );
}

function CardHeader({ props }: { props: StudioCardProps }) {
  const { req, index, disabled } = props;
  return (
    <>
      <Box sx={{ display: "flex", direction: "ltr", alignItems: "center", justifyContent: "space-between" }}>
        <ButtonBase
          aria-label={he.studioStepMenu(stepNumber(index))}
          data-testid="studio-card-menu"
          onClick={props.onOpenMenu}
          disabled={disabled}
          sx={{ width: 44, height: 32, m: "-6px -10px", borderRadius: `${flowRadius.sm}px` }}
        >
          <Box component="img" src={dotsIcon} alt="" sx={{ width: 19, height: 4.724 }} />
        </ButtonBase>
        <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_66 }}>{stepNumber(index)}</Typography>
      </Box>
      <InputBase
        value={req.title ?? ""}
        onChange={(e) => props.onTitle(e.target.value)}
        placeholder={he.studioStepTitlePlaceholder}
        disabled={disabled}
        inputProps={{ maxLength: MAX_SLOT_TITLE, "aria-label": he.studioStepTitleLabel, dir: "auto" }}
        sx={{ ...studioBareInputSx, mt: "16px", ...flowText.h2, color: flowColor.neutral900 }}
      />
      <InputBase
        value={req.hint ?? ""}
        onChange={(e) => props.onHint(e.target.value)}
        placeholder={he.studioStepHintPlaceholder}
        disabled={disabled}
        multiline
        maxRows={4}
        inputProps={{ maxLength: MAX_SLOT_HINT, "aria-label": he.studioStepHintLabel, dir: "auto" }}
        sx={{ ...studioBareInputSx, ...flowText.body, color: flowColor.alphaNeutral900_60 }}
      />
    </>
  );
}

/** Boutons de la carte : le noir dit ce que fera l'oved (on le touche pour changer de type), puis le lien d'exemple. */
function CardActions({ props }: { props: StudioCardProps }) {
  const { req, disabled } = props;
  const guideAllowed = !kindSkipsExample(req.kind);
  const guideSet = Boolean(req.guide_video_url);
  return (
    <Box sx={{ display: "flex", direction: "ltr", alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
      <ButtonBase
        data-testid="studio-guide-link"
        onClick={props.onOpenGuide}
        disabled={disabled || !guideAllowed}
        sx={{ ...studioSmallButtonSx, color: flowColor.neutral900, "&.Mui-disabled": { opacity: 0.35 } }}
      >
        {guideSet ? (
          <Box aria-label={he.studioGuideSet} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: flowColor.green700 }} />
        ) : null}
        {he.flowExampleLink}
      </ButtonBase>
      <ButtonBase
        data-testid="studio-kind-button"
        aria-label={`${he.studioChangeKind}: ${primaryActionLabel(req.kind)}`}
        onClick={props.onOpenKind}
        disabled={disabled}
        sx={{ ...studioSmallButtonSx, minWidth: 136, pl: "8px", bgcolor: flowColor.neutral900, color: flowColor.neutral0 }}
      >
        <KeyboardArrowDownRoundedIcon sx={{ fontSize: 20, opacity: 0.8 }} />
        {primaryActionLabel(req.kind)}
      </ButtonBase>
    </Box>
  );
}

/**
 * Carte active du studio : même silhouette, mêmes mesures et mêmes couleurs que `FlowCard` (oved),
 * mais chaque élément se modifie sur place.
 */
export default function StudioCard(props: StudioCardProps) {
  const { tone } = props;
  return (
    <Box
      component="section"
      data-testid="studio-card"
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
        sx={{ position: "absolute", inset: "0.6% 0 0 0", zIndex: 0, bgcolor: flowToneColor[tone].card, ...flowMaskSx(flowShape.card) }}
      />
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <CardHeader props={props} />
      </Box>
      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "24px", mt: "auto" }}>
        <ExampleArea props={props} />
        <CardActions props={props} />
      </Box>
    </Box>
  );
}
