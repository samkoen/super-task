import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../context/FeedbackContext";
import type { EmployeeLanguage } from "../domain/employeeLanguages";
import type { EmployeeTaskCard } from "../services/dashboardService";
import { taskService } from "../services/taskService";
import { mediaService } from "../services/mediaService";
import { he } from "../i18n/he";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { effectiveRequirements } from "../utils/completionMedia";
import {
  employeeCompletePayload,
  shouldPromptIncomplete,
} from "../utils/employeeIncompleteSubmit";
import {
  canDoTask,
  canSubmitEmployeeTask,
  cardAfterStart,
  completeAfterEnsuringStart,
  employeeSubmitLocked,
  resolveTaskForComplete,
  shouldAutoCompleteEmployeeTask,
  shouldOpenStartUrlOnBegin,
} from "../utils/employeeDoTask";
import {
  slotsFromTaskCompletion,
  slotsMeetTaskRequirements,
  uploadRequirementSlots,
} from "../utils/employeeCompletionUpload";
import { type PendingMedia, revokePendingMedia } from "../utils/pendingMedia";
import { playTaskEndSound } from "../utils/notificationSounds";
import { openExternalUrl } from "../utils/startUrl";
import { scheduleConfirmCompletionMedia } from "../utils/confirmCompletionMedia";
import { waitUntilPendingVideosReady } from "../utils/videoSlotReady";

export async function submitOwnCompletion(opts: {
  taskId: string;
  slotsFilled: boolean;
  note: string;
  requirements: ReturnType<typeof effectiveRequirements>;
  slots: Array<PendingMedia | null>;
  incompleteReason?: string;
}) {
  await waitUntilPendingVideosReady(opts.slots);
  const attachments = await uploadRequirementSlots(
    opts.requirements,
    opts.slots,
    {
      photo: taskService.uploadPhoto,
      video: taskService.uploadVideo,
      audio: taskService.uploadAudio,
    },
    opts.slotsFilled,
  );
  await completeAfterEnsuringStart(
    () =>
      taskService
        .complete(
          opts.taskId,
          employeeCompletePayload({
            slotsFilled: opts.slotsFilled,
            note: opts.note,
            attachments,
            incompleteReason: opts.incompleteReason,
          }),
        )
        .then(() => undefined),
    () => taskService.start(opts.taskId).then(() => undefined),
  );
  scheduleConfirmCompletionMedia(
    opts.taskId,
    attachments,
    (id) => taskService.confirmMedia(id),
    (url) => mediaService.isReady(url),
  );
}

export function useOwnTaskWork(onChanged: () => void) {
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const language = ((user?.preferred_language || "he") as EmployeeLanguage);
  const [detailTask, setDetailTask] = useState<EmployeeTaskCard | null>(null);
  const [note, setNote] = useState("");
  const [slotMedia, setSlotMedia] = useState<Array<PendingMedia | null>>([]);
  const [saving, setSaving] = useState(false);
  const [photoAnnotating, setPhotoAnnotating] = useState(false);
  const [linkedStartReady, setLinkedStartReady] = useState(true);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const linkedStartRef = useRef<Promise<boolean> | null>(null);
  const linkedStartIdRef = useRef<string | null>(null);
  const autoCompleteGen = useRef(0);

  const clearMedia = useCallback(() => {
    setSlotMedia((prev) => {
      prev.forEach((item) => revokePendingMedia(item));
      return [];
    });
  }, []);

  const persistLinkedStart = usePersistLinkedStart(
    setDetailTask,
    showError,
    setLinkedStartReady,
    linkedStartRef,
    linkedStartIdRef,
  );
  const open = useOpenOwnTask({
    clearMedia,
    persistLinkedStart,
    setDetailTask,
    setNote,
    setSlotMedia,
    setLinkedStartReady,
    showSuccess,
  });
  const close = useCallback(() => {
    clearMedia();
    setPhotoAnnotating(false);
    setIncompleteOpen(false);
    setDetailTask(null);
  }, [clearMedia]);

  const requirements = useMemo(
    () => (detailTask && canDoTask(detailTask.status) ? effectiveRequirements(detailTask) : []),
    [detailTask],
  );
  const canSubmitDone = slotsMeetTaskRequirements(requirements, slotMedia);
  const submit = useSubmitOwnTask({
    detailTask,
    saving,
    note,
    slotMedia,
    requirements,
    setSaving,
    setDetailTask,
    setLinkedStartReady,
    setIncompleteOpen,
    clearMedia,
    showSuccess,
    showError,
    onChanged,
  });

  return {
    language,
    detailTask,
    incompleteOpen,
    closeIncomplete: () => setIncompleteOpen(false),
    confirmIncomplete: (reason: string) => {
      setIncompleteOpen(false);
      void submit(slotMedia, reason);
    },
    open,
    close,
    handleSlotsChange: (next: Array<PendingMedia | null>) => {
      setSlotMedia(next);
      maybeAutoSubmit(detailTask, saving, requirements, next, linkedStartReady, autoCompleteGen, submit);
    },
    capture: ownTaskCapture({
      detailTask,
      slotMedia,
      note,
      setNote,
      saving,
      photoAnnotating,
      setPhotoAnnotating,
      canSubmitDone,
      linkedStartReady,
      submit,
      onSlotsChange: (next) => {
        setSlotMedia(next);
        maybeAutoSubmit(detailTask, saving, requirements, next, linkedStartReady, autoCompleteGen, submit);
      },
    }),
  };
}

function maybeAutoSubmit(
  detailTask: EmployeeTaskCard | null,
  saving: boolean,
  requirements: ReturnType<typeof effectiveRequirements>,
  next: Array<PendingMedia | null>,
  linkedStartReady: boolean,
  autoCompleteGen: MutableRefObject<number>,
  submit: (slots?: Array<PendingMedia | null>, reason?: string) => Promise<void>,
) {
  if (!detailTask || saving) return;
  const filled = slotsMeetTaskRequirements(requirements, next);
  if (
    !shouldAutoCompleteEmployeeTask(
      requirements.length,
      filled,
      detailTask.status,
      detailTask.start_url,
      linkedStartReady,
      Boolean(detailTask.completion),
    )
  ) {
    return;
  }
  const gen = (autoCompleteGen.current += 1);
  void waitUntilPendingVideosReady(next).then(() => {
    if (gen !== autoCompleteGen.current) return;
    void submit(next);
  });
}

function ownTaskCapture(opts: {
  detailTask: EmployeeTaskCard | null;
  slotMedia: Array<PendingMedia | null>;
  note: string;
  setNote: (v: string) => void;
  saving: boolean;
  photoAnnotating: boolean;
  setPhotoAnnotating: (v: boolean) => void;
  canSubmitDone: boolean;
  linkedStartReady: boolean;
  submit: () => Promise<void>;
  onSlotsChange: (next: Array<PendingMedia | null>) => void;
}) {
  if (!opts.detailTask || !canDoTask(opts.detailTask.status)) return undefined;
  return {
    slots: opts.slotMedia,
    onSlotsChange: opts.onSlotsChange,
    note: opts.note,
    onNoteChange: opts.setNote,
    onSubmit: () => {
      if (employeeSubmitLocked(opts.saving, opts.photoAnnotating)) return;
      void opts.submit();
    },
    canSubmit:
      canSubmitEmployeeTask(
        opts.detailTask.status,
        opts.detailTask.start_url,
        opts.canSubmitDone,
        opts.linkedStartReady,
      ) && !opts.photoAnnotating,
    slotsFilled: opts.canSubmitDone,
    saving: employeeSubmitLocked(opts.saving, opts.photoAnnotating),
    onAnnotatingChange: opts.setPhotoAnnotating,
  };
}

function usePersistLinkedStart(
  setDetailTask: (fn: (prev: EmployeeTaskCard | null) => EmployeeTaskCard | null) => void,
  showError: (msg: string) => void,
  setLinkedStartReady: (v: boolean) => void,
  linkedStartRef: MutableRefObject<Promise<boolean> | null>,
  linkedStartIdRef: MutableRefObject<string | null>,
) {
  return useCallback(async (task: EmployeeTaskCard) => {
    if (linkedStartIdRef.current === task.id && linkedStartRef.current) {
      return linkedStartRef.current;
    }
    const run = (async () => {
      try {
        const result = await taskService.start(task.id);
        const next = cardAfterStart(task, result.occurrence);
        setDetailTask((prev) => (prev?.id === task.id ? next : prev));
        setLinkedStartReady(true);
        return true;
      } catch (e) {
        showError(apiErrorMessage(e, he.errorGeneric));
        setDetailTask((prev) => (prev?.id === task.id ? task : prev));
        setLinkedStartReady(false);
        linkedStartRef.current = null;
        linkedStartIdRef.current = null;
        return false;
      }
    })();
    linkedStartIdRef.current = task.id;
    linkedStartRef.current = run;
    return run;
  }, [linkedStartIdRef, linkedStartRef, setDetailTask, setLinkedStartReady, showError]);
}

function useOpenOwnTask(opts: {
  clearMedia: () => void;
  persistLinkedStart: (task: EmployeeTaskCard) => Promise<boolean>;
  setDetailTask: (task: EmployeeTaskCard) => void;
  setNote: (note: string) => void;
  setSlotMedia: (slots: Array<PendingMedia | null>) => void;
  setLinkedStartReady: (ready: boolean) => void;
  showSuccess: (msg: string) => void;
}) {
  return useCallback((task: EmployeeTaskCard) => {
    const openLink = shouldOpenStartUrlOnBegin(task.status, task.start_url);
    if (openLink) openExternalUrl(task.start_url);
    opts.clearMedia();
    const next = openLink ? cardAfterStart(task) : task;
    opts.setSlotMedia(
      canDoTask(next.status)
        ? slotsFromTaskCompletion(effectiveRequirements(next), next.completion)
        : [],
    );
    opts.setNote(next.completion?.note ?? "");
    opts.setDetailTask(next);
    opts.setLinkedStartReady(!openLink);
    if (openLink) {
      opts.showSuccess(he.startTaskOpenedLink);
      void opts.persistLinkedStart(task);
    }
  }, [opts]);
}

function useSubmitOwnTask(args: {
  detailTask: EmployeeTaskCard | null;
  saving: boolean;
  note: string;
  slotMedia: Array<PendingMedia | null>;
  requirements: ReturnType<typeof effectiveRequirements>;
  setSaving: (v: boolean) => void;
  setDetailTask: (task: EmployeeTaskCard | null) => void;
  setLinkedStartReady: (v: boolean) => void;
  setIncompleteOpen: (v: boolean) => void;
  clearMedia: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  onChanged: () => void;
}) {
  const {
    detailTask, saving, note, slotMedia, requirements, setSaving, setDetailTask,
    setLinkedStartReady, setIncompleteOpen, clearMedia, showSuccess, showError, onChanged,
  } = args;
  return useCallback(async (slots?: Array<PendingMedia | null>, incompleteReason?: string) => {
    if (!detailTask || saving) return;
    const media = slots ?? slotMedia;
    const openLink = shouldOpenStartUrlOnBegin(detailTask.status, detailTask.start_url);
    const slotsFilled = slotsMeetTaskRequirements(requirements, media);
    if (openLink) openExternalUrl(detailTask.start_url);
    if (shouldPromptIncomplete(slotsFilled, openLink) && incompleteReason == null) {
      setIncompleteOpen(true);
      return;
    }
    setSaving(true);
    try {
      const resolved = await resolveTaskForComplete(detailTask, {
        openLink,
        slotsFilled,
        start: () => taskService.start(detailTask.id),
      });
      setDetailTask(resolved.task);
      setLinkedStartReady(true);
      if (resolved.deferComplete) {
        showSuccess(he.startTaskOpenedLink);
        return;
      }
      await submitOwnCompletion({
        taskId: resolved.task.id,
        slotsFilled,
        note,
        requirements: effectiveRequirements(resolved.task),
        slots: media,
        incompleteReason,
      });
      setIncompleteOpen(false);
      clearMedia();
      setDetailTask(null);
      playTaskEndSound();
      showSuccess(he.taskSubmitSuccess);
      onChanged();
    } catch (e) {
      showError(apiErrorMessage(e, he.errorGeneric));
    } finally {
      setSaving(false);
    }
  }, [
    clearMedia, detailTask, note, onChanged, requirements, saving, setDetailTask,
    setIncompleteOpen, setLinkedStartReady, setSaving, showError, showSuccess, slotMedia,
  ]);
}
