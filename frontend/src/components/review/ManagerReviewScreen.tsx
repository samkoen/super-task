import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alert, Box, CircularProgress, Dialog } from "@mui/material";
import FlowPageHeader from "../taskflow/FlowPageHeader";
import { ApiError } from "../../services/api";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { he } from "../../i18n/he";
import { flowColor, flowScreenBackground, flowSize } from "../../styles/flowTokens";
import { queuePosition, type ReviewQueueEntry } from "../../utils/managerReview";
import ManagerReviewBody from "./ManagerReviewBody";
import { withSystemTopInsetCss, withSystemBottomInsetCss } from "../../utils/systemInsets";

export type ManagerReviewRequest = { startId: string; queue: ReviewQueueEntry[] };

type Props = {
  request: ManagerReviewRequest | null;
  onClose: () => void;
  /** Après chaque décision (message de succès) : l'accueil se recharge. */
  onDone: (message?: string) => void;
};

/** Version fraîche de la tâche (preuve, sous-tâches, note) : la ligne de la liste ne suffit pas. */
export function useReviewTask(id: string | null) {
  const [task, setTask] = useState<TaskOccurrence | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return undefined;
    let stop = false;
    setTask(null);
    setError("");
    taskService.getOccurrence(id)
      .then((occurrence) => { if (!stop) setTask(occurrence); })
      .catch((e) => { if (!stop) setError(e instanceof ApiError ? e.message : he.managerReviewLoadError); });
    return () => { stop = true; };
  }, [id]);
  return { task: task?.id === id ? task : null, error };
}

/** File figée à l'ouverture : le compteur « 2 מתוך 5 » ne bouge pas quand l'accueil se recharge. */
function useReviewQueue(request: ManagerReviewRequest | null, onClose: () => void) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [decided, setDecided] = useState<string[]>([]);
  const [queue, setQueue] = useState<ReviewQueueEntry[]>([]);
  useEffect(() => {
    setCurrentId(request?.startId ?? null);
    setQueue(request?.queue ?? []);
    setDecided([]);
  }, [request]);
  const advance = useCallback(() => {
    if (!currentId) return;
    const done = [...decided, currentId];
    const next = queuePosition(queue, currentId, done).next;
    setDecided(done);
    if (next) setCurrentId(next.id);
    else onClose();
  }, [currentId, decided, queue, onClose]);
  const position = currentId ? queuePosition(queue, currentId, decided) : null;
  return { currentId, position, advance };
}

/** Revue plein écran du menahel : une preuve après l'autre, passage automatique à la suivante. */
export default function ManagerReviewScreen({ request, onClose, onDone }: Props) {
  const { currentId, position, advance } = useReviewQueue(request, onClose);
  const { task, error } = useReviewTask(currentId);
  const decided = (message?: string) => { onDone(message); advance(); };
  return (
    <ReviewScreenShell open={Boolean(request)} onClose={onClose} testId="manager-review-screen">
      {task && position ? (
        <ManagerReviewBody key={task.id} task={task} position={position} onBack={onClose} onDecided={decided} onStatusChanged={(_status, notice) => decided(notice)} />
      ) : (
        <ReviewLoading title={he.managerReviewTitle} error={error} onBack={onClose} />
      )}
    </ReviewScreenShell>
  );
}

type ShellProps = { open: boolean; onClose: () => void; testId: string; children: ReactNode };

/** Plein écran du FLOW (fond, colonne de 440 px, marges système) partagé par la revue et le résumé. */
export function ReviewScreenShell({ open, onClose, testId, children }: ShellProps) {
  return (
    <Dialog open={open} onClose={onClose} fullScreen dir="rtl" PaperProps={{ sx: { background: flowScreenBackground } }} disableEnforceFocus>
      <Box data-testid={testId} sx={{ width: "100%", maxWidth: 440, mx: "auto", px: `${flowSize.contentPaddingX}px`, pt: withSystemTopInsetCss("20px"), pb: withSystemBottomInsetCss("32px"), display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
      </Box>
    </Dialog>
  );
}

/** En-tête seul pendant le chargement (ou l'erreur) de la tâche. */
export function ReviewLoading({ title, error, onBack }: { title: string; error: string; onBack: () => void }) {
  return (
    <>
      <FlowPageHeader title={title} titleColor={flowColor.neutral900} onBack={onBack} />
      {error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ alignSelf: "center", color: flowColor.navy800 }} />}
    </>
  );
}
