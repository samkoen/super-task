import { useCallback, useState } from "react";
import { Box, Dialog } from "@mui/material";
import FlowBottomNav, { flowBottomNavClearanceCss } from "./FlowBottomNav";
import FlowGuideSheet from "./FlowGuideSheet";
import FlowReview from "./FlowReview";
import FlowSentDialog from "./FlowSentDialog";
import FlowSkipSheet from "./FlowSkipSheet";
import FlowSummary from "./FlowSummary";
import FlowTaskChat from "./FlowTaskChat";
import FlowToast from "./FlowToast";
import TaskCardStack from "./TaskCardStack";
import TaskFlowHeader from "./TaskFlowHeader";
import { useTaskFlow } from "../../hooks/useTaskFlow";
import type { SubmitSlotResponse, TaskCompletion, TaskStatus } from "../../services/taskService";
import { flowScreenBackground } from "../../styles/flowTokens";
import { effectiveRequirements, type CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import type { GeoPoint } from "../../utils/geoCheck";
import { hasPendingUpload, sentVideoCount, summaryPhase } from "../../utils/flowSummary";
import { handedOverCount } from "../../utils/slotUploadState";

export type TaskFlowTask = {
  id: string;
  title: string;
  due_at?: string | null;
  status: TaskStatus;
  completion?: TaskCompletion | null;
  completion_requirements?: CompletionRequirement[] | null;
  /** Nom du menahel : sous-titre du chat de la tâche. */
  manager_name?: string | null;
  photo_required?: boolean;
  min_video_seconds?: number | null;
};

export type TaskFlowScreenProps = {
  task: TaskFlowTask;
  /** Ouverture de משמרת : écran récap (10) avant de revenir aux tâches du jour. */
  shiftOpening?: boolean;
  /** Avatar et salutation de l'en-tête (« שלום אבי, בוקר טוב. »). */
  employeeName?: string | null;
  photoUrl?: string | null;
  /** Nom du snif de l'oved : « צולם בסניף … » dans la revue vidéo. */
  branch?: string | null;
  /** Coordonnées GPS du snif (si le menahel les a définies) : vérifie « צולם בסניף ». */
  branchCenter?: GeoPoint | null;
  onClose: () => void;
  /** Fin du flow : la page ferme l'écran et affiche la confirmation. */
  onFinished: () => void;
  onOpenChats: () => void;
  onServerUpdate?: (response: SubmitSlotResponse | null) => void;
  onChatUpdated?: () => void;
  onError?: (message: string) => void;
};

type Flow = ReturnType<typeof useTaskFlow>;

const paperProps = { sx: { background: flowScreenBackground } };

/**
 * Récap (10) : il s'ouvre seul quand toutes les cartes sont remises, ou à tout moment avec l'icône
 * « סיכום » de la barre du haut. C'est lui qui envoie au serveur.
 */
function useFinish() {
  const [summary, setSummary] = useState(false);
  /** Carte à rouvrir en revenant du récap (« לצלם עכשיו »). */
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const onAllHandedOver = useCallback(() => setSummary(true), []);
  const leaveSummary = useCallback((focus: number | null = null) => {
    setFocusIndex(focus);
    setSummary(false);
  }, []);
  return { summary, focusIndex, onAllHandedOver, leaveSummary };
}

type ReviewLayerProps = {
  flow: Flow;
  requirements: CompletionRequirement[];
  branch?: string | null;
  branchCenter?: GeoPoint | null;
};

function ReviewLayer({ flow, requirements, branch, branchCenter }: ReviewLayerProps) {
  const index = flow.reviewIndex;
  const state = index !== null ? flow.states[index] : null;
  const req = index !== null ? requirements[index] : null;
  return (
    <FlowReview
      open={index !== null}
      title={req && index !== null ? slotDisplayTitle(req, index) : ""}
      previewUrl={state?.previewUrl}
      durationSeconds={state?.durationSeconds}
      minSeconds={req?.min_seconds}
      lightOk={state?.lightOk}
      capturedAt={state?.capturedAt}
      branch={branch}
      branchCenter={branchCenter}
      location={state?.location}
      progress={{ done: handedOverCount(flow.states), total: flow.states.length }}
      onConfirm={() => index !== null && flow.confirmSlot(index)}
      onRetake={() => index !== null && flow.retakeSlot(index)}
      onTrim={(range) => (index !== null ? flow.trimSlot(index, range) : Promise.resolve())}
    />
  );
}

/** Récap (10/10ב) puis, pour une ouverture de משמרת, popup « הסרטונים נשלחו » (11) une fois tout parti. */
function SummaryLayer({ props, flow, requirements, onBack }: { props: TaskFlowScreenProps; flow: Flow; requirements: CompletionRequirement[]; onBack: (focus?: number | null) => void }) {
  const shiftOpening = Boolean(props.shiftOpening);
  const phase = summaryPhase(flow.states, flow.sending);
  const sentPopup = shiftOpening && phase === "done" && !hasPendingUpload(flow.states);
  // Retour Android : comme les boutons de l'écran (revenir aux cartes, ou continuer une fois envoyé).
  const onClose = () => {
    if (phase === "ready" || phase === "incomplete") onBack();
    else if (phase === "done") props.onFinished();
  };
  return (
    <Dialog open fullScreen dir="rtl" PaperProps={paperProps} onClose={onClose}>
      <FlowSummary
        shiftOpening={shiftOpening}
        requirements={requirements}
        states={flow.states}
        sending={flow.sending}
        onSend={() => void flow.sendAll()}
        onContinue={props.onFinished}
        onBack={() => onBack()}
        onFilmNow={(index) => {
          flow.unskipSlot(index);
          onBack(index);
        }}
      />
      <FlowSentDialog open={sentPopup} count={sentVideoCount(flow.states)} onContinue={props.onFinished} />
      {/* Écran 05ז : après « דיווח והמשך » sur la dernière carte, le toast reste visible sur le récap. */}
      <FlowToast toast={flow.toast?.kind === "skipReported" ? flow.toast : null} onClose={flow.closeToast} />
    </Dialog>
  );
}

function FlowBody({ props, flow, requirements, focusIndex, onGuide, onSkip, onChat, onOpenSummary }: {
  props: TaskFlowScreenProps;
  flow: Flow;
  requirements: CompletionRequirement[];
  focusIndex: number | null;
  onGuide: (index: number) => void;
  onSkip: (index: number) => void;
  onChat: (index: number) => void;
  onOpenSummary: () => void;
}) {
  return (
    <Box data-testid="task-flow" sx={{ width: "100%", maxWidth: 393, mx: "auto", pb: flowBottomNavClearanceCss() }}>
      <TaskFlowHeader
        title={props.task.title}
        dueAt={props.task.due_at}
        employeeName={props.employeeName}
        photoUrl={props.photoUrl}
        onBack={props.onClose}
        onOpenSummary={onOpenSummary}
      />
      <Box sx={{ px: "24px" }}>
        <TaskCardStack
          requirements={requirements}
          states={flow.states}
          retake={flow.retake}
          focusIndex={focusIndex}
          online={flow.online}
          onCapture={flow.capture}
          onSendText={flow.saveText}
          onOpenGuide={onGuide}
          onSkip={onSkip}
          onChat={onChat}
        />
      </Box>
      <FlowBottomNav onHome={props.onClose} onChat={props.onOpenChats} />
    </Box>
  );
}

/** Écran d'une tâche oved (FLOW 1) : pile de cartes pilotée par `completion_requirements` du menahel. */
export default function TaskFlowScreen(props: TaskFlowScreenProps) {
  const { task, shiftOpening = false } = props;
  const requirements = effectiveRequirements(task);
  const { summary, focusIndex, onAllHandedOver, leaveSummary } = useFinish();
  const flow = useTaskFlow({
    occurrenceId: task.id,
    requirements,
    completion: task.completion,
    onAllHandedOver,
    onError: props.onError,
    onServerUpdate: props.onServerUpdate,
  });
  const [guideIndex, setGuideIndex] = useState<number | null>(null);
  const [skipIndex, setSkipIndex] = useState<number | null>(null);
  /** Sous-tâche dont le chat est ouvert (écran 12ב). */
  const [chatSlot, setChatSlot] = useState<number | null>(null);

  if (summary) return <SummaryLayer props={{ ...props, shiftOpening }} flow={flow} requirements={requirements} onBack={leaveSummary} />;
  return (
    <Dialog open fullScreen dir="rtl" PaperProps={paperProps} disableEnforceFocus onClose={props.onClose}>
      <FlowBody props={props} flow={flow} requirements={requirements} focusIndex={focusIndex} onGuide={setGuideIndex} onSkip={setSkipIndex} onChat={setChatSlot} onOpenSummary={onAllHandedOver} />
      <FlowToast toast={flow.toast} onClose={flow.closeToast} />
      <FlowGuideSheet req={guideIndex !== null ? requirements[guideIndex] : null} index={guideIndex ?? 0} onClose={() => setGuideIndex(null)} />
      <FlowSkipSheet
        req={skipIndex !== null ? requirements[skipIndex] : null}
        index={skipIndex ?? 0}
        onClose={() => setSkipIndex(null)}
        onConfirm={(index, draft) => {
          flow.skipSlot(index, draft);
          setSkipIndex(null);
        }}
      />
      <ReviewLayer flow={flow} requirements={requirements} branch={props.branch} branchCenter={props.branchCenter} />
      <FlowTaskChat
        slotIndex={chatSlot}
        occurrenceId={task.id}
        title={task.title}
        status={task.status}
        managerName={task.manager_name}
        requirements={requirements}
        onClose={() => setChatSlot(null)}
        onOccurrenceUpdated={props.onChatUpdated}
      />
    </Dialog>
  );
}
