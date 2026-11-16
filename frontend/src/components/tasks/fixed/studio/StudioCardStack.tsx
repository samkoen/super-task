import { useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { FlowNextTab } from "../../../taskflow/FlowTab";
import { he } from "../../../../i18n/he";
import { flowMaskSx, flowShape } from "../../../../styles/flowShapes";
import { flowColor, flowRadius, flowSize, flowText, flowToneForIndex } from "../../../../styles/flowTokens";
import {
  addRequirement,
  clearRequirementGuideVideo,
  commitVideoSeconds,
  MAX_COMPLETION_REQUIREMENTS,
  removeRequirement,
  setRequirementExample,
  setRequirementGuideVideo,
  setRequirementHint,
  setRequirementTitle,
  setVideoSeconds,
  type CompletionKind,
  type CompletionRequirement,
} from "../../../../utils/completionMedia";
import { slotDisplayTitle } from "../../../../utils/completionSlotView";
import { stepNumber } from "../../../../utils/flowStack";
import {
  activeAfterRemove,
  changeRequirementKind,
  clearRequirementExample,
  moveRequirement,
} from "../../../../utils/studioRequirements";
import StudioCard from "./StudioCard";
import { KindIcon, StudioGuideSheet, StudioKindSheet, StudioStepMenuSheet } from "./StudioStepSheets";

type Props = {
  value: CompletionRequirement[];
  onChange: (next: CompletionRequirement[]) => void;
  disabled?: boolean;
};

type KindTarget = { mode: "add" } | { mode: "change"; index: number } | null;

/** Onglet d'une carte déjà passée (au-dessus de la carte active), comme les onglets « נשלח » de l'oved. */
function PrevTab({ req, index, narrow, zIndex, onSelect }: {
  req: CompletionRequirement;
  index: number;
  narrow: boolean;
  zIndex: number;
  onSelect: () => void;
}) {
  const width = narrow ? flowSize.tabNarrowWidth : flowSize.tabWideWidth;
  return (
    <ButtonBase
      data-testid="studio-tab-prev"
      data-index={index}
      onClick={onSelect}
      sx={{
        zIndex,
        width: `${(width / flowSize.cardWidth) * 100}%`,
        height: flowSize.tabDoneHeight,
        mb: `-${flowSize.tabOverlap}px`,
        pt: "16px",
        pb: "24px",
        px: "27px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        bgcolor: flowColor.neutral0,
        borderRadius: `${flowRadius.xl2}px ${flowRadius.xl2}px 0 0`,
        boxShadow: "0 -1px 0 rgba(17,21,29,0.04)",
      }}
    >
      <Typography
        dir="auto"
        sx={{ ...flowText.label, minWidth: 0, color: flowColor.alphaNeutral900_66, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {stepNumber(index)} · {slotDisplayTitle(req, index)}
      </Typography>
      <KindIcon kind={req.kind} size={18} />
    </ButtonBase>
  );
}

/** Pile vide : la silhouette de la carte blanche avec l'invitation à créer le premier שלב. */
function EmptyStack({ onAdd, disabled }: { onAdd: () => void; disabled?: boolean }) {
  return (
    <Box
      data-testid="studio-empty-stack"
      sx={{ position: "relative", width: "100%", maxWidth: flowSize.cardWidth, minHeight: 260, px: "28px", py: "36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", textAlign: "center" }}
    >
      <Box aria-hidden sx={{ position: "absolute", inset: 0, bgcolor: flowColor.neutral0, ...flowMaskSx(flowShape.card) }} />
      <Typography sx={{ ...flowText.h2, position: "relative", color: flowColor.neutral900 }}>{he.studioEmptyTitle}</Typography>
      <Typography sx={{ ...flowText.body, position: "relative", color: flowColor.alphaNeutral900_60 }}>{he.studioEmptyHint}</Typography>
      <ButtonBase
        onClick={onAdd}
        disabled={disabled}
        sx={{ position: "relative", mt: "8px", height: 48, px: "20px", gap: "6px", borderRadius: `${flowRadius.sm}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.button }}
      >
        <AddRoundedIcon sx={{ fontSize: 20 }} />
        {he.studioAddStep}
      </ButtonBase>
    </Box>
  );
}

function AddStepButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <ButtonBase
      data-testid="studio-add-step"
      onClick={onClick}
      disabled={disabled}
      sx={{
        mt: "20px",
        width: "100%",
        maxWidth: flowSize.cardWidth,
        height: 52,
        gap: "6px",
        borderRadius: `${flowRadius.full}px`,
        border: `1.5px dashed ${flowColor.alphaNavy800_60}`,
        color: flowColor.navy800,
        ...flowText.button,
        "&.Mui-disabled": { opacity: 0.4 },
      }}
    >
      <AddRoundedIcon sx={{ fontSize: 20 }} />
      {he.studioAddStep}
    </ButtonBase>
  );
}

/**
 * Les שלבים de la tâche, dans la pile de cartes du FLOW 1 : carte active modifiable,
 * cartes précédentes en onglets au-dessus, suivantes en onglets colorés en dessous.
 */
export default function StudioCardStack({ value, onChange, disabled = false }: Props) {
  const [active, setActive] = useState(0);
  const [kindTarget, setKindTarget] = useState<KindTarget>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [guideIndex, setGuideIndex] = useState<number | null>(null);
  const current = Math.min(active, Math.max(value.length - 1, 0));
  const canAdd = !disabled && value.length < MAX_COMPLETION_REQUIREMENTS;

  const pickKind = (kind: CompletionKind) => {
    if (kindTarget?.mode === "change") {
      onChange(changeRequirementKind(value, kindTarget.index, kind));
    } else {
      const next = addRequirement(value, kind);
      if (next.length > value.length) {
        onChange(next);
        setActive(next.length - 1);
      }
    }
    setKindTarget(null);
  };

  const remove = (index: number) => {
    const next = removeRequirement(value, index);
    onChange(next);
    setActive(activeAfterRemove(current, index, next.length));
    setMenuIndex(null);
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = moveRequirement(value, index, delta);
    if (next === value) return;
    onChange(next);
    setActive(index + delta);
    setMenuIndex(index + delta);
  };

  if (value.length === 0) {
    return (
      <>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <EmptyStack onAdd={() => setKindTarget({ mode: "add" })} disabled={!canAdd} />
        </Box>
        <StudioKindSheet open={Boolean(kindTarget)} onPick={pickKind} onClose={() => setKindTarget(null)} />
      </>
    );
  }

  const above = value.map((_, i) => i).filter((i) => i < current);
  const below = value.map((_, i) => i).filter((i) => i > current);
  const req = value[current];
  return (
    <Box data-testid="studio-card-stack" sx={{ width: "100%", maxWidth: flowSize.cardWidth, mx: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {above.map((index, order) => (
        <PrevTab key={index} req={value[index]} index={index} narrow={order === 0} zIndex={order + 1} onSelect={() => setActive(index)} />
      ))}
      <StudioCard
        key={current}
        req={req}
        index={current}
        tone={flowToneForIndex(current)}
        disabled={disabled}
        onTitle={(title) => onChange(setRequirementTitle(value, current, title))}
        onHint={(hint) => onChange(setRequirementHint(value, current, hint))}
        onExample={(file) => onChange(setRequirementExample(value, current, URL.createObjectURL(file), file))}
        onExampleClear={() => onChange(clearRequirementExample(value, current))}
        onOpenMenu={() => setMenuIndex(current)}
        onOpenKind={() => setKindTarget({ mode: "change", index: current })}
        onOpenGuide={() => setGuideIndex(current)}
      />
      {below.map((index, order) => (
        <FlowNextTab
          key={index}
          index={index}
          title={slotDisplayTitle(value[index], index)}
          tone={flowToneForIndex(index)}
          variant={order === below.length - 1 ? "narrow" : "wide"}
          zIndex={9 - order}
          onSelect={() => setActive(index)}
        />
      ))}
      <AddStepButton onClick={() => setKindTarget({ mode: "add" })} disabled={!canAdd} />
      <StudioKindSheet
        open={Boolean(kindTarget)}
        current={kindTarget?.mode === "change" ? value[kindTarget.index]?.kind : undefined}
        onPick={pickKind}
        onClose={() => setKindTarget(null)}
      />
      <StudioStepMenuSheet
        req={menuIndex !== null ? value[menuIndex] ?? null : null}
        index={menuIndex ?? 0}
        count={value.length}
        onClose={() => {
          if (menuIndex !== null) onChange(commitVideoSeconds(value, menuIndex));
          setMenuIndex(null);
        }}
        onSeconds={(seconds) => menuIndex !== null && onChange(setVideoSeconds(value, menuIndex, seconds))}
        onChangeKind={() => {
          const index = menuIndex ?? current;
          setMenuIndex(null);
          setKindTarget({ mode: "change", index });
        }}
        onMove={(delta) => menuIndex !== null && move(menuIndex, delta)}
        onRemove={() => menuIndex !== null && remove(menuIndex)}
      />
      <StudioGuideSheet
        req={guideIndex !== null ? value[guideIndex] ?? null : null}
        onPick={(file) => guideIndex !== null && onChange(setRequirementGuideVideo(value, guideIndex, URL.createObjectURL(file), file))}
        onClear={() => guideIndex !== null && onChange(clearRequirementGuideVideo(value, guideIndex))}
        onClose={() => setGuideIndex(null)}
      />
    </Box>
  );
}
