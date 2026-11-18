import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import FlowCard from "./FlowCard";
import { FlowDoneTab, FlowNextTab } from "./FlowTab";
import type { MediaKind } from "../media/MediaCaptureActions";
import { flowSize, flowToneForIndex } from "../../styles/flowTokens";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import { canRevisit, isKeptCapture, layoutAround, stackLayout } from "../../utils/flowStack";
import { isHandedOver, nextOpenIndex, type SlotUiState } from "../../utils/slotUploadState";
import { animateExit, animateSettle, snapshotStack, stackMotionEnabled, type ExitKind, type StackSnapshot } from "./stackMotion";

export type TaskCardStackProps = {
  requirements: CompletionRequirement[];
  states: SlotUiState[];
  disabled?: boolean;
  onCapture: (index: number, file: File, kind: MediaKind, durationSeconds?: number, lightOk?: boolean | null) => void;
  onSendText: (index: number, text: string) => void;
  onOpenGuide: (index: number) => void;
  /** Menu « ••• » › « לא ניתן לצלם » sur la carte active (ouvre la feuille de raison). */
  onSkip?: (index: number) => void;
  /** Chat de la sous-tâche `index` (menu « ••• » de la carte, icône de la caméra). */
  onChat?: (index: number) => void;
  /** Demande de refilmer la carte `index` : incrémenter `nonce` rouvre la caméra. */
  retake?: { index: number; nonce: number } | null;
  /** Carte à ouvrir en premier (« לצלם עכשיו » depuis le récap). */
  focusIndex?: number | null;
  /** Réseau disponible : sinon les prises confirmées affichent « ממתין להעלאה » (écran 09ב). */
  online?: boolean;
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
      onSkip={props.onSkip && !isKeptCapture(states[index]) ? () => props.onSkip?.(index) : undefined}
      onChat={props.onChat ? () => props.onChat?.(index) : undefined}
    />
  );
}

type Pending = { before: StackSnapshot; previousActive: number | null };

/**
 * Carte active choisie par l'oved, animations comprises. Quand la carte active vient d'être remise
 * (confirmée, envoyée, « לא ניתן לצלם »), elle reste un instant à l'écran puis s'envole et la sous-tâche
 * suivante prend sa place toute seule : l'oved n'a rien à toucher.
 */
function useStackNavigation(states: SlotUiState[], focusIndex: number | null | undefined) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [preferred, setPreferred] = useState<number | null>(focusIndex ?? null);
  /** Carte remise gardée à l'écran le temps de l'animation. */
  const [hold, setHold] = useState<number | null>(null);
  const [seen, setSeen] = useState<{ states: SlotUiState[]; active: number | null }>(() => ({ states, active: stackLayout(states, preferred).active }));
  const pending = useRef<Pending | null>(null);
  const busy = useRef(false);

  // État dérivé pendant le rendu : repère la carte active qui vient de passer « remise ».
  if (seen.states !== states) {
    const shown = seen.active;
    const justDone = shown !== null && hold === null && states[shown] && seen.states[shown]
      && !isHandedOver(seen.states[shown].status) && isHandedOver(states[shown].status);
    setSeen({ states, active: shown });
    if (justDone) {
      const next = nextOpenIndex(states, shown);
      if (stackMotionEnabled() && next !== null) setHold(shown);
      else if (next !== null) setPreferred(next);
    }
  }

  const layout = hold !== null ? layoutAround(states, hold) : stackLayout(states, preferred);
  if (seen.states === states && seen.active !== layout.active) setSeen({ states, active: layout.active });

  const go = useCallback(async (next: number | null, kind: ExitKind) => {
    if (busy.current) return;
    busy.current = true;
    await animateExit(containerRef.current, kind);
    pending.current = { before: snapshotStack(containerRef.current), previousActive: layout.active };
    setHold(null);
    if (next !== null) setPreferred(next);
    busy.current = false;
  }, [layout.active]);

  useLayoutEffect(() => {
    const job = pending.current;
    pending.current = null;
    if (job) animateSettle(containerRef.current, job.before, job.previousActive);
  }, [layout.active]);

  // Carte remise : laisser le temps à la revue plein écran de se fermer, puis passer à la suivante.
  useEffect(() => {
    if (hold === null) return;
    const timer = window.setTimeout(() => void go(nextOpenIndex(states, hold), "done"), 420);
    return () => window.clearTimeout(timer);
  }, [hold, states, go]);

  const select = useCallback((index: number) => {
    if (index === layout.active) return;
    if (!stackMotionEnabled()) {
      setHold(null);
      setPreferred(index);
      return;
    }
    void go(index, "swipe");
  }, [go, layout.active]);

  return { containerRef, layout, select };
}

/**
 * Pile de cartes du FLOW 1 : les cartes remises « minces » au-dessus, la carte active en grand,
 * les cartes à faire repliées en dessous. L'oved touche l'onglet de son choix : ordre libre.
 */
export default function TaskCardStack(props: TaskCardStackProps) {
  const { requirements, states } = props;
  const { containerRef, layout, select } = useStackNavigation(states, props.focusIndex);
  if (!requirements.length) return null;
  return (
    <Box
      ref={containerRef}
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
          online={props.online ?? true}
          onSelect={canRevisit(states[index]) ? () => select(index) : undefined}
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
          onSelect={() => select(index)}
        />
      ))}
    </Box>
  );
}
