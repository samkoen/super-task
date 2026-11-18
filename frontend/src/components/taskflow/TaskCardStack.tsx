import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Box } from "@mui/material";
import FlowCard from "./FlowCard";
import { FlowDoneTab, FlowNextTab } from "./FlowTab";
import type { MediaKind } from "../media/MediaCaptureActions";
import { flowSize, flowToneForIndex } from "../../styles/flowTokens";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import { canRevisit, isKeptCapture, layoutAround, stackLayout, type StackLayout } from "../../utils/flowStack";
import { isHandedOver, nextOpenIndex, type SlotUiState } from "../../utils/slotUploadState";
import { cardVariants, STACK_LAYOUT_TRANSITION, stackMotionEnabled, tabVariants, type ExitKind } from "./stackMotion";

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

/**
 * Carte active choisie par l'oved. Quand la carte active vient d'être remise (confirmée, envoyée,
 * « לא ניתן לצלם »), elle reste un instant à l'écran puis s'envole et la sous-tâche suivante prend sa
 * place toute seule : l'oved n'a rien à toucher.
 */
function useStackNavigation(states: SlotUiState[], focusIndex: number | null | undefined, animated: boolean) {
  const [preferred, setPreferred] = useState<number | null>(focusIndex ?? null);
  /** Carte remise gardée à l'écran le temps que la revue plein écran se ferme. */
  const [hold, setHold] = useState<number | null>(null);
  const [exitKind, setExitKind] = useState<ExitKind>("swipe");
  const [seen, setSeen] = useState<{ states: SlotUiState[]; active: number | null }>(() => ({ states, active: stackLayout(states, preferred).active }));

  // État dérivé pendant le rendu : repère la carte active qui vient de passer « remise ».
  if (seen.states !== states) {
    const shown = seen.active;
    const justDone = shown !== null && hold === null && states[shown] && seen.states[shown]
      && !isHandedOver(seen.states[shown].status) && isHandedOver(states[shown].status);
    setSeen({ states, active: shown });
    if (justDone) {
      const next = nextOpenIndex(states, shown);
      if (animated && next !== null) setHold(shown);
      else if (next !== null) setPreferred(next);
    }
  }

  const layout = hold !== null ? layoutAround(states, hold) : stackLayout(states, preferred);
  if (seen.states === states && seen.active !== layout.active) setSeen({ states, active: layout.active });

  useEffect(() => {
    if (hold === null) return;
    const timer = window.setTimeout(() => {
      setExitKind("done");
      setHold(null);
      const next = nextOpenIndex(states, hold);
      if (next !== null) setPreferred(next);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [hold, states]);

  const select = useCallback((index: number) => {
    setExitKind("swipe");
    setHold(null);
    setPreferred(index);
  }, []);

  return { layout, select, exitKind };
}

type SlotProps = {
  index: number;
  role: "card" | "tab";
  zIndex: number;
  exitKind: ExitKind;
  animated: boolean;
  children: ReactNode;
};

const SLOT_STYLE = { width: "100%", display: "flex", flexDirection: "column", alignItems: "center" } as const;

/**
 * Place d'une sous-tâche dans la pile : elle glisse vers sa nouvelle position (layout), et son contenu
 * passe d'onglet à carte (ou l'inverse) avec la sortie « swipe » / « done » de la carte.
 */
function StackSlot({ index, role, zIndex, exitKind, animated, children }: SlotProps) {
  if (!animated) return <>{children}</>;
  return (
    <motion.div layout="position" transition={STACK_LAYOUT_TRANSITION} data-slot={index} style={{ ...SLOT_STYLE, position: "relative", zIndex }}>
      <AnimatePresence mode="popLayout" initial={false} custom={exitKind}>
        <motion.div
          key={role}
          custom={exitKind}
          variants={role === "card" ? cardVariants : tabVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          style={SLOT_STYLE}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

type Slot = { exitKind: ExitKind; animated: boolean };

function stackItems(props: TaskCardStackProps, layout: StackLayout, select: (index: number) => void, slot: Slot): ReactNode[] {
  const { requirements, states } = props;
  const above = layout.above.map((index, order) => (
    <StackSlot key={index} index={index} role="tab" zIndex={order + 1} {...slot}>
      <FlowDoneTab
        index={index}
        state={states[index]}
        variant={order === 0 ? "narrow" : "wide"}
        zIndex={order + 1}
        online={props.online ?? true}
        onSelect={canRevisit(states[index]) ? () => select(index) : undefined}
      />
    </StackSlot>
  ));
  const active = layout.active !== null ? [
    <StackSlot key={layout.active} index={layout.active} role="card" zIndex={10} {...slot}>
      <ActiveCard props={props} index={layout.active} />
    </StackSlot>,
  ] : [];
  const below = layout.below.map((index, order) => (
    <StackSlot key={index} index={index} role="tab" zIndex={9 - order} {...slot}>
      <FlowNextTab
        index={index}
        title={slotDisplayTitle(requirements[index], index)}
        tone={flowToneForIndex(index)}
        variant={order === layout.below.length - 1 ? "narrow" : "wide"}
        zIndex={9 - order}
        onSelect={() => select(index)}
      />
    </StackSlot>
  ));
  return [...above, ...active, ...below];
}

/**
 * Pile de cartes du FLOW 1 : les cartes remises « minces » au-dessus, la carte active en grand,
 * les cartes à faire repliées en dessous. L'oved touche l'onglet de son choix : ordre libre.
 */
export default function TaskCardStack(props: TaskCardStackProps) {
  const { requirements, states } = props;
  const [animated] = useState(stackMotionEnabled);
  const { layout, select, exitKind } = useStackNavigation(states, props.focusIndex, animated);
  if (!requirements.length) return null;
  const slot = { exitKind, animated };
  return (
    <Box
      data-testid="task-card-stack"
      sx={{ width: "100%", maxWidth: flowSize.cardWidth, mx: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Une seule liste à clés : une sous-tâche qui passe d'onglet à carte garde son StackSlot (pas de remontage). */}
      <LayoutGroup>{stackItems(props, layout, select, slot)}</LayoutGroup>
    </Box>
  );
}
