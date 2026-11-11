import { useCallback, useState } from "react";
import { Box, ButtonBase, Dialog } from "@mui/material";
import FlowBottomNav, { flowBottomNavClearanceCss } from "./FlowBottomNav";
import FlowGuideSheet from "./FlowGuideSheet";
import FlowReview from "./FlowReview";
import FlowSummary from "./FlowSummary";
import FlowTaskChat from "./FlowTaskChat";
import FlowToast from "./FlowToast";
import TaskCardStack from "./TaskCardStack";
import TaskFlowHeader from "./TaskFlowHeader";
import { useTaskFlow } from "../../hooks/useTaskFlow";
import type { SubmitSlotResponse, TaskCompletion, TaskStatus } from "../../services/taskService";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowScreenBackground, flowSize, flowText } from "../../styles/flowTokens";
import { effectiveRequirements, type CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import type { GeoPoint } from "../../utils/geoCheck";
import { readyForSummary } from "../../utils/flowSummary";
import { handedOverCount, needsSending } from "../../utils/slotUploadState";

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

/** Toutes les cartes confirmées : le récap (10) prend la main, c'est lui qui envoie au serveur. */
function useFinish() {
  const [summary, setSummary] = useState(false);
  const onAllHandedOver = useCallback(() => setSummary(true), []);
  const leaveSummary = useCallback(() => setSummary(false), []);
  return { summary, onAllHandedOver, leaveSummary };
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

function OpenSummaryButton({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      data-testid="flow-open-summary"
      onClick={onClick}
      sx={{ width: "100%", maxWidth: flowSize.cardWidth, mx: "auto", mt: 2, height: flowSize.roundButton, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.button }}
    >
      {he.flowSummaryTitleReady}
    </ButtonBase>
  );
}

function FlowBody({ props, flow, requirements, onGuide, onChat, onOpenSummary }: {
  props: TaskFlowScreenProps;
  flow: Flow;
  requirements: CompletionRequirement[];
  onGuide: (index: number) => void;
  onChat: () => void;
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
        onOpenChat={onChat}
      />
      <Box sx={{ px: "24px" }}>
        <TaskCardStack
          requirements={requirements}
          states={flow.states}
          retake={flow.retake}
          onCapture={flow.capture}
          onSendText={flow.saveText}
          onOpenGuide={onGuide}
        />
        {readyForSummary(flow.states) && needsSending(flow.states) ? <OpenSummaryButton onClick={onOpenSummary} /> : null}
      </Box>
      <FlowBottomNav onHome={props.onClose} onChat={props.onOpenChats} />
    </Box>
  );
}

/** Écran d'une tâche oved (FLOW 1) : pile de cartes pilotée par `completion_requirements` du menahel. */
export default function TaskFlowScreen(props: TaskFlowScreenProps) {
  const { task, shiftOpening = false } = props;
  const requirements = effectiveRequirements(task);
  const { summary, onAllHandedOver, leaveSummary } = useFinish();
  const flow = useTaskFlow({
    occurrenceId: task.id,
    requirements,
    completion: task.completion,
    onAllHandedOver,
    onError: props.onError,
    onServerUpdate: props.onServerUpdate,
  });
  const [guideIndex, setGuideIndex] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  if (summary) {
    return (
      <Dialog open fullScreen dir="rtl" PaperProps={paperProps}>
        <FlowSummary
          shiftOpening={shiftOpening}
          requirements={requirements}
          states={flow.states}
          sending={flow.sending}
          onSend={() => void flow.sendAll()}
          onContinue={props.onFinished}
          onBack={leaveSummary}
        />
      </Dialog>
    );
  }
  return (
    <Dialog open fullScreen dir="rtl" PaperProps={paperProps} disableEnforceFocus>
      <FlowBody props={props} flow={flow} requirements={requirements} onGuide={setGuideIndex} onChat={() => setChatOpen(true)} onOpenSummary={onAllHandedOver} />
      <FlowToast toast={flow.toast} onClose={flow.closeToast} />
      <FlowGuideSheet req={guideIndex !== null ? requirements[guideIndex] : null} index={guideIndex ?? 0} onClose={() => setGuideIndex(null)} />
      <ReviewLayer flow={flow} requirements={requirements} branch={props.branch} branchCenter={props.branchCenter} />
      <FlowTaskChat
        open={chatOpen}
        occurrenceId={task.id}
        title={task.title}
        status={task.status}
        managerName={task.manager_name}
        requirements={requirements}
        statuses={flow.states.map((state) => state.status)}
        onClose={() => setChatOpen(false)}
        onOccurrenceUpdated={props.onChatUpdated}
      />
    </Dialog>
  );
}
