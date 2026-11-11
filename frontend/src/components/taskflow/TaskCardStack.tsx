import { useState } from "react";
import { Box } from "@mui/material";
import FlowCard from "./FlowCard";
import { FlowDoneTab, FlowNextTab } from "./FlowTab";
import type { MediaKind } from "../media/MediaCaptureActions";
import { flowSize, flowToneForIndex } from "../../styles/flowTokens";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import { canRevisit, stackLayout } from "../../utils/flowStack";
import { isHandedOver, type SlotUiState } from "../../utils/slotUploadState";

export type TaskCardStackProps = {
  requirements: CompletionRequirement[];
  states: SlotUiState[];
  disabled?: boolean;
  onCapture: (index: number, file: File, kind: MediaKind, durationSeconds?: number, lightOk?: boolean | null) => void;
  onSendText: (index: number, text: string) => void;
  onOpenGuide: (index: number) => void;
  /** Demande de refilmer la carte `index` : incrémenter `nonce` rouvre la caméra. */
  retake?: { index: number; nonce: number } | null;
};

function ActiveCard({ props, index }: { props: TaskCardStackProps; index: number }) {
  const { requirements, states, retake } = props;
  return (
    <FlowCard
      key={index}
      req={requirements[index]}
      index={index}
      state={states[index]}
      tone={flowToneForIndex(index)}
      disabled={props.disabled}
      progress={{ done: states.filter((s) => isHandedOver(s.status)).length, total: states.length }}
      autoCaptureNonce={retake?.index === index ? retake.nonce : undefined}
      onCapture={(file, kind, seconds, lightOk) => props.onCapture(index, file, kind, seconds, lightOk)}
      onSendText={(text) => props.onSendText(index, text)}
      onOpenGuide={() => props.onOpenGuide(index)}
    />
  );
}

/**
 * Pile de cartes du FLOW 1 : les cartes remises « minces » au-dessus, la carte active en grand,
 * les cartes à faire repliées en dessous. L'oved touche l'onglet de son choix : ordre libre.
 */
export default function TaskCardStack(props: TaskCardStackProps) {
  const { requirements, states } = props;
  const [preferred, setPreferred] = useState<number | null>(null);
  const layout = stackLayout(states, preferred);
  if (!requirements.length) return null;
  return (
    <Box
      data-testid="task-card-stack"
      sx={{ width: "100%", maxWidth: flowSize.cardWidth, mx: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {layout.above.map((index, order) => (
        <FlowDoneTab
          key={index}
          index={index}
          state={states[index]}
          variant={order === 0 ? "narrow" : "wide"}
          zIndex={order + 1}
          onSelect={canRevisit(states[index]) ? () => setPreferred(index) : undefined}
        />
      ))}
      {layout.active !== null ? <ActiveCard props={props} index={layout.active} /> : null}
      {layout.below.map((index, order) => (
        <FlowNextTab
          key={index}
          index={index}
          title={slotDisplayTitle(requirements[index], index)}
          tone={flowToneForIndex(index)}
          variant={order === layout.below.length - 1 ? "narrow" : "wide"}
          zIndex={9 - order}
          onSelect={() => setPreferred(index)}
        />
      ))}
    </Box>
  );
}
