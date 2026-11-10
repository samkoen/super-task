import { useCallback, useState } from "react";
import { Box, Dialog } from "@mui/material";
import FlowGuideSheet from "./FlowGuideSheet";
import FlowReview from "./FlowReview";
import FlowSummary from "./FlowSummary";
import FlowTaskChat from "./FlowTaskChat";
import FlowToast from "./FlowToast";
import TaskCardStack from "./TaskCardStack";
import TaskFlowHeader from "./TaskFlowHeader";
import { useTaskFlow } from "../../hooks/useTaskFlow";
import { he } from "../../i18n/he";
import type { SubmitSlotResponse, TaskCompletion, TaskStatus } from "../../services/taskService";
import { flowScreenBackground } from "../../styles/flowTokens";
import { effectiveRequirements, type CompletionRequirement } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";

export type TaskFlowTask = {
  id: string;
  title: string;
  due_at?: string | null;
  status: TaskStatus;
  completion?: TaskCompletion | null;
  completion_requirements?: CompletionRequirement[] | null;
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

function useFinish(shiftOpening: boolean, onFinished: () => void) {
  const [summary, setSummary] = useState(false);
  const onAllHandedOver = useCallback(() => {
    if (shiftOpening) setSummary(true);
    else onFinished();
  }, [shiftOpening, onFinished]);
  return { summary, onAllHandedOver };
}

function ReviewLayer({ flow, requirements }: { flow: Flow; requirements: CompletionRequirement[] }) {
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
      onConfirm={() => index !== null && void flow.confirm(index)}
      onRetake={() => index !== null && flow.retakeSlot(index)}
    />
  );
}

function FlowBody({ props, flow, requirements, onGuide, onChat }: {
  props: TaskFlowScreenProps;
  flow: Flow;
  requirements: CompletionRequirement[];
  onGuide: (index: number) => void;
  onChat: (index: number) => void;
}) {
  return (
    <Box data-testid="task-flow" sx={{ width: "100%", maxWidth: 393, mx: "auto", pb: 4 }}>
      <TaskFlowHeader
        title={props.task.title}
        dueAt={props.task.due_at}
        employeeName={props.employeeName}
        photoUrl={props.photoUrl}
        onBack={props.onClose}
        onOpenChats={props.onOpenChats}
      />
      <Box sx={{ px: "24px" }}>
        <TaskCardStack
          requirements={requirements}
          states={flow.states}
          retake={flow.retake}
          onCapture={flow.capture}
          onSendText={(index, text) => void flow.submitText(index, text)}
          onOpenGuide={onGuide}
          onChat={onChat}
        />
      </Box>
    </Box>
  );
}

/** Écran d'une tâche oved (FLOW 1) : pile de cartes pilotée par `completion_requirements` du menahel. */
export default function TaskFlowScreen(props: TaskFlowScreenProps) {
  const { task, shiftOpening = false } = props;
  const requirements = effectiveRequirements(task);
  const { summary, onAllHandedOver } = useFinish(shiftOpening, props.onFinished);
  const flow = useTaskFlow({
    occurrenceId: task.id,
    requirements,
    completion: task.completion,
    onAllHandedOver,
    onError: props.onError,
    onServerUpdate: props.onServerUpdate,
  });
  const [guideIndex, setGuideIndex] = useState<number | null>(null);
  const [chat, setChat] = useState<{ index: number | null } | null>(null);

  if (summary) {
    return (
      <Dialog open fullScreen dir="rtl" PaperProps={paperProps}>
        <FlowSummary title={he.flowSummaryTitleOpen} requirements={requirements} states={flow.states} onContinue={props.onFinished} />
      </Dialog>
    );
  }
  return (
    <Dialog open fullScreen dir="rtl" PaperProps={paperProps} disableEnforceFocus>
      <FlowBody props={props} flow={flow} requirements={requirements} onGuide={setGuideIndex} onChat={(index) => setChat({ index })} />
      <FlowToast toast={flow.toast} onClose={flow.closeToast} />
      <FlowGuideSheet req={guideIndex !== null ? requirements[guideIndex] : null} index={guideIndex ?? 0} onClose={() => setGuideIndex(null)} />
      <ReviewLayer flow={flow} requirements={requirements} />
      <FlowTaskChat
        open={chat !== null}
        initialIndex={chat?.index ?? null}
        occurrenceId={task.id}
        title={task.title}
        status={task.status}
        completion={task.completion}
        requirements={requirements}
        onClose={() => setChat(null)}
        onOccurrenceUpdated={props.onChatUpdated}
      />
    </Dialog>
  );
}
