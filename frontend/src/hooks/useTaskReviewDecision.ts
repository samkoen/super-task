import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/api";
import { taskService, type TaskOccurrence } from "../services/taskService";
import { he } from "../i18n/he";
import { normalizeRequirements } from "../utils/completionMedia";
import { attachmentsFromCompletion } from "../utils/completionSlotView";
import { DEFAULT_REVIEW_QUALITY_RATING } from "../utils/qualityRating";
import { initialReviewMediaReady } from "../utils/reviewMediaGate";
import { reopenReviewedTask, upsertReviewPhotoMark, type ReviewPhotoMark } from "../utils/reviewReopenPhotos";
import { buildReviewItems, buildReviewPayload, initialDrafts, summarizeReview, type SlotDrafts } from "../utils/slotReview";

/** Attend que les vidéos soient montées côté serveur avant de permettre une décision. */
function useMediaReady(task: TaskOccurrence | null): boolean {
  const [ready, setReady] = useState(true);
  const taskId = task?.id;
  const isReview = task?.status === "pending_review";
  useEffect(() => setReady(initialReviewMediaReady(task?.completion?.media_ready)), [taskId, task?.completion?.media_ready]);
  useEffect(() => {
    if (!taskId || !isReview || ready) return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const result = await taskService.confirmMedia(taskId);
        if (!stop && result.media_ready) setReady(true);
      } catch {
        /* nouvel essai au prochain tour */
      }
    };
    const timer = window.setInterval(() => void tick(), 2000);
    void tick();
    return () => { stop = true; window.clearInterval(timer); };
  }, [taskId, isReview, ready]);
  return ready;
}

/** Sous-tâches à trancher une par une (V / X) quand la tâche en a. */
function useSlotDrafts(task: TaskOccurrence | null) {
  const completion = task?.completion;
  const items = useMemo(() => {
    const requirements = normalizeRequirements(task?.completion_requirements);
    if (!requirements.length || completion?.status !== "completed") return [];
    return buildReviewItems(requirements, attachmentsFromCompletion(completion));
  }, [task?.completion_requirements, completion]);
  const [drafts, setDrafts] = useState<SlotDrafts>({});
  // Nouveau dossier seulement quand on change de tâche ou de soumission.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDrafts(initialDrafts(items)), [task?.id, completion?.completed_at]);
  return { items, drafts, setDrafts, summary: summarizeReview(items, drafts) };
}

/**
 * Décision du menahel sur une preuve : accepter avec une note, renvoyer avec une remarque
 * (et les photos annotées), ou trancher sous-tâche par sous-tâche.
 */
export function useTaskReviewDecision(task: TaskOccurrence | null, onDecided: (message: string) => void) {
  const [rating, setRating] = useState<number | null>(DEFAULT_REVIEW_QUALITY_RATING);
  const [marks, setMarks] = useState<ReviewPhotoMark[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mediaReady = useMediaReady(task);
  const slots = useSlotDrafts(task);

  useEffect(() => { setRating(DEFAULT_REVIEW_QUALITY_RATING); setMarks([]); setError(""); }, [task?.id]);

  const run = async (action: (id: string) => Promise<string>) => {
    if (!task || saving) return;
    setSaving(true);
    setError("");
    try {
      onDecided(await action(task.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };
  const needsRating = () => { if (rating != null) return false; setError(he.qualityRatingRequired); return true; };

  const approve = () => {
    if (needsRating()) return;
    void run(async (id) => { await taskService.approve(id, { quality_rating: rating as number }); return he.taskApprovedSuccess; });
  };
  const reopen = (note: string) => void run(async (id) => {
    await reopenReviewedTask({ occurrenceId: id, note, fallbackNote: he.taskReopenNoteFallback, marks });
    return he.taskReopenedSuccess;
  });
  const finishSlots = () => {
    if (slots.summary.outcome === "approve" && needsRating()) return;
    void run(async (id) => {
      const payload = await buildReviewPayload({ items: slots.items, drafts: slots.drafts, rating, uploadPhoto: (f) => taskService.uploadPhoto(f) });
      const result = await taskService.reviewSlots(id, payload);
      return result.outcome === "approved" ? he.taskApprovedSuccess : he.taskReopenedSuccess;
    });
  };
  const addMark = (sourceUrl: string, file: File) => setMarks((prev) => upsertReviewPhotoMark(prev, { sourceUrl, file }));

  return { rating, setRating, marks, addMark, saving, error, mediaReady, slots, slotMode: slots.items.length > 0, approve, reopen, finishSlots };
}
