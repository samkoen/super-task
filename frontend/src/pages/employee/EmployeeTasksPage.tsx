import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { ApiError } from "../../services/api";
import { useFeedback } from "../../context/FeedbackContext";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import {
  dashboardService,
  type EmployeeDashboard,
  type EmployeeTaskCard,
} from "../../services/dashboardService";
import { taskService, type TaskTranslation, type TaskOccurrence } from "../../services/taskService";
import { issueReportService } from "../../services/issueReportService";
import { employeeActivityService } from "../../services/employeeActivityService";
import { dispatchBreakChange } from "../../utils/employeeBreakMute";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { playTaskEndSound } from "../../utils/notificationSounds";
import { useSearchParams } from "react-router-dom";
import { taskIdFromSearch } from "../../utils/notificationNavigation";
import {
  collectUniqueTasks,
  splitEmployeeWorkLists,
} from "../../utils/employeeDashboardSections";
import { formatHebrewDay, todayIso } from "../../utils/dateView";
import MediaCaptureActions, { type MediaKind } from "../../components/media/MediaCaptureActions";
import EmployeeClaimTaskDialog from "../../components/tasks/EmployeeClaimTaskDialog";
import EmployeeTaskDetailDialog from "../../components/tasks/EmployeeTaskDetailDialog";
import EmployeeTaskTitle from "../../components/tasks/EmployeeTaskTitle";
import EmployeeShiftHeader from "../../components/employee/EmployeeShiftHeader";
import EmployeeAvatarCapture from "../../components/employee/EmployeeAvatarCapture";
import EmployeeTaskRow from "../../components/employee/EmployeeTaskRow";
import EmployeeTaskSection from "../../components/employee/EmployeeTaskSection";
import DirectChatThread from "../../components/chat/DirectChatThread";
import FullscreenBackAppBar, {
  fullscreenChatBodySx,
  fullscreenChatDialogPaperSx,
} from "../../components/chat/FullscreenBackAppBar";
import { directChatService, type DirectChatCard } from "../../services/directChatService";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";
import {
  employeeManagerLabel,
  employeeOpenMineScope,
  employeeSurfaceChatState,
  needsEmployeeManagerPicker,
} from "../../utils/employeeDirectChat";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import { he } from "../../i18n/he";
import {
  type PendingMedia,
  revokePendingMedia,
  uploadPendingMedia,
} from "../../utils/pendingMedia";
import {
  effectiveRequirements,
  meetsCompletionRequirements,
} from "../../utils/completionMedia";
import {
  applyStartedOnDashboard,
  canDoTask,
  canSubmitEmployeeTask,
  cardAfterStart,
  needsTaskStart,
  revertStartedOnDashboard,
  shouldOpenStartUrlOnBegin,
  waitForInFlightLinkedStart,
} from "../../utils/employeeDoTask";
import { openExternalUrl } from "../../utils/startUrl";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";

function jobLabel(jobFunction: string | null | undefined): string {
  if (!jobFunction) return he.roleEmployee;
  const labels = he.jobFunctionLabels as Record<string, string>;
  return labels[jobFunction] ?? jobFunction;
}

async function uploadRequirementSlots(
  requirements: ReturnType<typeof effectiveRequirements>,
  slots: Array<PendingMedia | null>,
) {
  const attachments = [];
  for (let i = 0; i < requirements.length; i += 1) {
    const req = requirements[i];
    const media = slots[i];
    const upload =
      req.kind === "photo"
        ? taskService.uploadPhoto
        : req.kind === "video"
          ? taskService.uploadVideo
          : taskService.uploadAudio;
    const url = await uploadPendingMedia(media, upload);
    if (!url) continue;
    attachments.push({
      kind: req.kind,
      url,
      duration_seconds: media?.durationSeconds ?? undefined,
    });
  }
  return attachments;
}

function mergeTaskTranslations<T extends EmployeeTaskCard>(
  tasks: T[],
  translations: TaskTranslation[]
): T[] {
  const byId = new Map(translations.map((item) => [item.id, item]));
  return tasks.map((task) => {
    const hit = byId.get(task.id);
    if (!hit) return task;
    return {
      ...task,
      title_he: hit.title_he ?? task.title_he ?? task.title,
      title: hit.title,
      description: hit.description,
      spoken_text: hit.spoken_text,
      display_language: hit.display_language,
      translation_pending: hit.translation_pending,
    };
  });
}

function mergeDashboardTranslations(
  dashboard: EmployeeDashboard,
  translations: TaskTranslation[]
): EmployeeDashboard {
  return {
    ...dashboard,
    urgent_tasks: mergeTaskTranslations(dashboard.urgent_tasks, translations),
    in_progress_tasks: mergeTaskTranslations(dashboard.in_progress_tasks, translations),
    awaiting_response_tasks: mergeTaskTranslations(
      dashboard.awaiting_response_tasks ?? [],
      translations,
    ),
    pending_review_tasks: mergeTaskTranslations(dashboard.pending_review_tasks, translations),
    today_tasks: mergeTaskTranslations(dashboard.today_tasks, translations),
    completed_tasks: mergeTaskTranslations(dashboard.completed_tasks, translations),
  };
}

function collectPendingIds(tasks: EmployeeTaskCard[], language: EmployeeLanguage): string[] {
  if (language === "he") return [];
  return tasks
    .filter(
      (task) =>
        task.translation_pending ||
        !task.display_language ||
        task.display_language !== language
    )
    .map((task) => task.id);
}

function toEmployeeCard(task: TaskOccurrence): EmployeeTaskCard {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    due_at: task.due_at,
    opened_on: task.opened_on,
    created_at: task.created_at,
    status: task.status,
    task_kind: task.task_kind,
    photo_required: task.photo_required,
    min_video_seconds: task.min_video_seconds ?? null,
    completion_requirements: task.completion_requirements ?? [],
    is_work_start: task.is_work_start,
    is_work_end: task.is_work_end,
    start_url: task.start_url ?? null,
    reference_photo_url: task.reference_photo_url ?? null,
    reference_video_url: task.reference_video_url ?? null,
    reference_audio_url: task.reference_audio_url ?? null,
    department_name: task.department_name ?? null,
    started_at: task.started_at,
    spoken_text: task.spoken_text,
    display_language: task.display_language,
    translation_pending: task.translation_pending,
    title_he: task.title_he,
    completion: task.completion ?? null,
    manager_next_at: task.manager_next_at,
    is_manager_next: task.is_manager_next,
  };
}

export default function EmployeeTasksPage() {
  const { user, refresh } = useAuth();
  const employeeLanguage = ((user?.preferred_language || "he") as EmployeeLanguage);
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useFeedback();
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<EmployeeTaskCard | null>(null);
  const [note, setNote] = useState("");
  const [slotMedia, setSlotMedia] = useState<Array<PendingMedia | null>>([]);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatManagers, setChatManagers] = useState<DirectChatCard[]>([]);
  const [chatPickerOpen, setChatPickerOpen] = useState(false);
  const [chatTitle, setChatTitle] = useState(he.directChatManagerTitle);
  const [reportText, setReportText] = useState("");
  const [reportPhotoUrl, setReportPhotoUrl] = useState("");
  const [reportVideoUrl, setReportVideoUrl] = useState("");
  const [reportAudioUrl, setReportAudioUrl] = useState("");
  const [onBreak, setOnBreak] = useState(false);
  const [breakBusy, setBreakBusy] = useState(false);
  const [reportUploadingKind, setReportUploadingKind] = useState<"photo" | "video" | "audio" | null>(null);
  const [reportSaving, setReportSaving] = useState(false);
  const [translatingTasks, setTranslatingTasks] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [linkedStartReady, setLinkedStartReady] = useState(true);
  const linkedStartRef = useRef<Promise<boolean> | null>(null);
  const linkedStartIdRef = useRef<string | null>(null);

  const translatePendingTasks = useCallback(
    async (language: EmployeeLanguage, tasks: EmployeeTaskCard[]) => {
      if (language === "he") return;
      const pendingIds = collectPendingIds(tasks, language);
      if (!pendingIds.length) return;
      setTranslatingTasks(true);
      try {
        const translations = await taskService.translateMine(pendingIds);
        setDashboard((prev) => (prev ? mergeDashboardTranslations(prev, translations) : prev));
      } catch {
        // Les tâches restent en hébreu si la traduction échoue.
      } finally {
        setTranslatingTasks(false);
      }
    },
    []
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const [data, breakState] = await Promise.all([
        dashboardService.getEmployee(todayIso()),
        employeeActivityService.getBreak().catch(() => ({ on_break: false, on_break_since: null })),
      ]);
      setDashboard(data);
      setOnBreak(Boolean(breakState.on_break));
      dispatchBreakChange(Boolean(breakState.on_break));
      const lang = (data.employee.preferred_language as EmployeeLanguage) || "he";
      const allTasks = [
        ...data.urgent_tasks,
        ...data.in_progress_tasks,
        ...(data.awaiting_response_tasks ?? []),
        ...data.pending_review_tasks,
        ...data.today_tasks,
        ...data.completed_tasks,
      ];
      void translatePendingTasks(lang, allTasks);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [translatePendingTasks, user?.preferred_language, user?.active_branch_id, user?.branch_id]);

  useEffect(() => {
    load();
  }, [load]);

  useTaskChangeListener(useCallback(() => {
    load(true);
  }, [load]));

  const loadChatUnread = useCallback(async () => {
    try {
      const data = await directChatService.inbox();
      const surface = employeeSurfaceChatState(data, user?.role);
      setChatUnread(surface.unread);
      setChatManagers(surface.managers);
    } catch {
      /* ignore */
    }
  }, [user?.role]);

  useEffect(() => {
    void loadChatUnread();
  }, [loadChatUnread]);
  useDirectChatLiveSync(null, () => void loadChatUnread());

  const openThread = async (scope?: "branch" | "network", title = he.directChatManagerTitle) => {
    const opened = await directChatService.openMine(scope);
    setChatId(opened.conversation.id);
    setChatTitle(title);
    setChatOpen(true);
    setChatPickerOpen(false);
    setChatUnread(0);
  };

  const openChat = async () => {
    try {
      const data = await directChatService.inbox();
      const surface = employeeSurfaceChatState(data, user?.role);
      const managers = surface.managers;
      setChatManagers(managers);
      setChatUnread(surface.unread);
      if (needsEmployeeManagerPicker(managers)) {
        setChatPickerOpen(true);
        return;
      }
      const only = managers[0];
      await openThread(employeeOpenMineScope(managers), only ? employeeManagerLabel(only) : he.directChatManagerTitle);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    void loadChatUnread();
  };

  const clearCompletionMedia = useCallback(() => {
    setSlotMedia((prev) => {
      prev.forEach((item) => revokePendingMedia(item));
      return [];
    });
  }, []);

  const persistLinkedStart = useCallback(async (task: EmployeeTaskCard) => {
    if (linkedStartIdRef.current === task.id && linkedStartRef.current) {
      return linkedStartRef.current;
    }
    const run = (async () => {
      try {
        const result = await taskService.start(task.id);
        const next: EmployeeTaskCard = cardAfterStart(task, result.occurrence);
        setDashboard((prev) => applyStartedOnDashboard(prev, task.id, next));
        setDetailTask((prev) => (prev?.id === task.id ? next : prev));
        setLinkedStartReady(true);
        return true;
      } catch (e) {
        showError(e instanceof ApiError ? e.message : he.errorGeneric);
        setDashboard((prev) => revertStartedOnDashboard(prev, task));
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
  }, [showError]);

  const openDetail = useCallback((task: EmployeeTaskCard) => {
    const openLink = shouldOpenStartUrlOnBegin(task.status, task.start_url);
    if (openLink) {
      openExternalUrl(task.start_url);
    }
    clearCompletionMedia();
    setNote("");
    const next: EmployeeTaskCard = openLink ? cardAfterStart(task) : task;
    setSlotMedia(canDoTask(next.status) ? effectiveRequirements(next).map(() => null) : []);
    setDetailTask(next);
    setLinkedStartReady(!openLink);
    if (openLink) {
      setDashboard((prev) => applyStartedOnDashboard(prev, task.id, next));
      showSuccess(he.startTaskOpenedLink);
      void persistLinkedStart(task);
    }
  }, [clearCompletionMedia, persistLinkedStart, showSuccess]);

  const closeDetail = useCallback(() => {
    clearCompletionMedia();
    setDetailTask(null);
  }, [clearCompletionMedia]);

  const requirements = useMemo(
    () => (detailTask && canDoTask(detailTask.status) ? effectiveRequirements(detailTask) : []),
    [detailTask],
  );
  const canSubmitDone = meetsCompletionRequirements(
    requirements,
    slotMedia.map((item, i) =>
      item ? { kind: requirements[i]?.kind ?? "photo", durationSeconds: item.durationSeconds } : null,
    ),
  );

  const handleReportUpload = useCallback(async (file: File, kind: MediaKind) => {
    setReportUploadingKind(kind);
    try {
      const res =
        kind === "photo"
          ? await issueReportService.uploadPhoto(file)
          : kind === "video"
            ? await issueReportService.uploadVideo(file)
            : await issueReportService.uploadAudio(file);
      if (kind === "photo") setReportPhotoUrl(res.url);
      if (kind === "video") setReportVideoUrl(res.url);
      if (kind === "audio") setReportAudioUrl(res.url);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setReportUploadingKind(null);
    }
  }, []);

  const hasReportContent = Boolean(
    reportText.trim() || reportPhotoUrl || reportVideoUrl || reportAudioUrl
  );

  const handleReportSubmit = async () => {
    if (!hasReportContent) return;
    setReportSaving(true);
    try {
      await issueReportService.createReport({
        text: reportText.trim() || undefined,
        photo_url: reportPhotoUrl || undefined,
        video_url: reportVideoUrl || undefined,
        audio_url: reportAudioUrl || undefined,
      });
      setReportOpen(false);
      showSuccess(he.issueReportSuccess);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setReportSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!detailTask) return;
    const openLink = shouldOpenStartUrlOnBegin(detailTask.status, detailTask.start_url);
    if (openLink) {
      openExternalUrl(detailTask.start_url);
    }
    setSaving(true);
    try {
      let task = detailTask;
      if (needsTaskStart(task.status)) {
        const result = await taskService.start(task.id);
        task = cardAfterStart(task, result.occurrence);
        setDashboard((prev) => applyStartedOnDashboard(prev, detailTask.id, task));
        setDetailTask(task);
        setLinkedStartReady(true);
        if (openLink) {
          showSuccess(he.startTaskOpenedLink);
          return;
        }
      } else {
        const started = await waitForInFlightLinkedStart(
          task,
          linkedStartRef.current,
          linkedStartIdRef.current,
        );
        if (!started) return;
        task = started;
      }
      const attachments = await uploadRequirementSlots(effectiveRequirements(task), slotMedia);
      await taskService.complete(task.id, {
        status: "completed",
        note: note || undefined,
        completion_attachments: attachments,
      });
      clearCompletionMedia();
      setDetailTask(null);
      if (!onBreak) playTaskEndSound();
      showSuccess(he.taskSubmitSuccess);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBreak = async () => {
    setBreakBusy(true);
    try {
      const res = onBreak
        ? await employeeActivityService.endBreak()
        : await employeeActivityService.startBreak();
      setOnBreak(Boolean(res.on_break));
      dispatchBreakChange(Boolean(res.on_break));
      showSuccess(onBreak ? he.employeeBreakEnded : he.employeeBreakStarted);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setBreakBusy(false);
    }
  };

  const handleAvatarCapture = async (file: File) => {
    setAvatarUploading(true);
    try {
      await authService.stylizeAvatar(file);
      await refresh();
      await load(true);
      showSuccess(he.employeePhotoStylized);
      setAvatarOpen(false);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setAvatarUploading(false);
    }
  };

  const urgentTasks = dashboard?.urgent_tasks ?? [];
  const inProgressTasks = dashboard?.in_progress_tasks ?? [];
  const awaitingResponseTasks = dashboard?.awaiting_response_tasks ?? [];
  const pendingReviewTasks = dashboard?.pending_review_tasks ?? [];
  const todayTasks = dashboard?.today_tasks ?? [];
  const completedTasks = dashboard?.completed_tasks ?? [];

  const workLists = useMemo(() => {
    const pool = collectUniqueTasks([
      inProgressTasks,
      awaitingResponseTasks,
      urgentTasks,
      todayTasks,
    ]);
    return splitEmployeeWorkLists(pool);
  }, [inProgressTasks, awaitingResponseTasks, urgentTasks, todayTasks]);

  const progress = dashboard?.progress_percent ?? 0;
  const openCount = workLists.dynamic.length + workLists.routine.length;
  const todayLabel = formatHebrewDay(dashboard?.due_on ?? todayIso());

  const cardById = useMemo(() => {
    const map = new Map<string, EmployeeTaskCard>();
    for (const task of [
      ...urgentTasks,
      ...inProgressTasks,
      ...awaitingResponseTasks,
      ...pendingReviewTasks,
      ...todayTasks,
      ...completedTasks,
    ]) {
      map.set(task.id, task);
    }
    return map;
  }, [
    urgentTasks,
    inProgressTasks,
    awaitingResponseTasks,
    pendingReviewTasks,
    todayTasks,
    completedTasks,
  ]);

  const alertTaskId = taskIdFromSearch(searchParams.toString());
  useEffect(() => {
    if (!alertTaskId || loading) return;
    const existing = cardById.get(alertTaskId);
    if (existing) {
      openDetail(existing);
      setSearchParams({}, { replace: true });
      return;
    }
    let cancelled = false;
    void taskService
      .getOccurrence(alertTaskId)
      .then((occ) => {
        if (cancelled) return;
        openDetail(toEmployeeCard(occ));
        setSearchParams({}, { replace: true });
      })
      .catch(() => {
        if (!cancelled) setSearchParams({}, { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [alertTaskId, loading, cardById, setSearchParams, openDetail]);

  const headerName = dashboard?.employee?.full_name ?? user?.full_name;
  const headerBranch = dashboard?.employee?.branch_name;
  const headerJob = dashboard?.employee?.job_function;
  const onShift = dashboard?.on_shift;
  const photoUrl = dashboard?.employee?.avatar_url ?? user?.avatar_url;

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", pb: withSystemBottomInsetCss("112px"), px: { xs: 1, sm: 2 } }}>
      <EmployeeShiftHeader
        dateLabel={todayLabel}
        name={headerName}
        photoUrl={photoUrl}
        photoEditable
        onEditPhoto={() => setAvatarOpen(true)}
        slogan={dashboard?.employee?.excellence_slogan ?? user?.excellence_slogan}
        meta={[
          headerBranch ? `${he.branch}: ${headerBranch}` : "",
          headerJob ? jobLabel(headerJob) : "",
        ]
          .filter(Boolean)
          .join(" · ")}
        onShift={Boolean(onShift)}
        onBreak={onBreak}
        breakBusy={breakBusy}
        progress={progress}
        onToggleBreak={() => void handleToggleBreak()}
        qualityRating={dashboard?.employee?.quality_rating}
      />

      <EmployeeAvatarCapture
        open={avatarOpen}
        uploading={avatarUploading}
        uploadingLabel={he.avatarStylizing}
        onClose={() => setAvatarOpen(false)}
        onCapture={handleAvatarCapture}
      />

      {translatingTasks && (
        <Alert severity="info" sx={{ mb: 2 }}>{he.taskTranslating}</Alert>
      )}

      {loading ? (
        <ListSkeleton variant="table" rows={5} />
      ) : (
        <>
          {openCount === 0 ? (
            <EmptyState
              title={he.noTasksToday}
              description={he.noTasksHint}
              icon={<TaskAltOutlinedIcon fontSize="inherit" />}
              compact
            />
          ) : (
            <>
              <EmployeeTaskSection
                title={he.employeeRoutineTasks}
                tasks={workLists.routine}
                onOpen={openDetail}
                layout="list"
              />
              <EmployeeTaskSection
                title={he.employeeDynamicTasks}
                tasks={workLists.dynamic}
                onOpen={openDetail}
                layout="tile"
                color="error.main"
              />
            </>
          )}

          <EmployeeTaskSection
            title={he.taskPendingReview}
            tasks={pendingReviewTasks}
            onOpen={openDetail}
          />

          {completedTasks.length > 0 && (
            <Accordion expanded={showCompleted} onChange={() => setShowCompleted((v) => !v)} sx={{ mt: 1, boxShadow: 0, border: 1, borderColor: "divider" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700}>
                  {showCompleted ? he.employeeHideCompleted : he.employeeShowCompleted} ({completedTasks.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 1, px: 1.5 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
                  {completedTasks.map((task) => (
                    <EmployeeTaskRow key={task.id} task={task} onOpen={openDetail} />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}

      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          bottom: withSystemBottomInsetCss("16px"),
          left: 16,
          right: 16,
          maxWidth: 520,
          mx: "auto",
          zIndex: (t) => t.zIndex.fab,
          borderRadius: 3,
          p: 1.25,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Badge badgeContent={chatUnread} color="error" sx={{ width: "100%", display: "block" }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ChatOutlinedIcon />}
            onClick={() => void openChat()}
            sx={{ borderRadius: 2.5, py: 1.1 }}
          >
            {he.directChatOpen}
          </Button>
        </Badge>
      </Paper>

      <Dialog
        fullScreen
        open={chatOpen}
        onClose={closeChat}
        dir="rtl"
        PaperProps={{ sx: fullscreenChatDialogPaperSx }}
      >
        <FullscreenBackAppBar title={chatTitle} onBack={closeChat} />
        <Box sx={fullscreenChatBodySx}>
          {chatId && <DirectChatThread conversationId={chatId} onSent={() => void loadChatUnread()} />}
        </Box>
      </Dialog>

      <Dialog open={chatPickerOpen} onClose={() => setChatPickerOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle>{he.directChatPickManager}</DialogTitle>
        <List>
          {chatManagers.map((card) => (
            <ListItemButton
              key={`${card.scope}-${card.counterpart_user_id}`}
              onClick={() =>
                void openThread(card.scope === "network" ? "network" : "branch", employeeManagerLabel(card)).catch((e) =>
                  showError(e instanceof ApiError ? e.message : he.errorGeneric),
                )
              }
            >
              <ListItemText
                primary={employeeManagerLabel(card)}
                secondary={card.unread_count ? String(card.unread_count) : undefined}
              />
            </ListItemButton>
          ))}
        </List>
      </Dialog>

      <EmployeeClaimTaskDialog
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        onClaimed={() => void load(true)}
      />

      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle>{he.issueReportTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={he.issueReportText}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            fullWidth
            multiline
            rows={4}
            placeholder={he.completionMediaHint}
          />
          <Typography variant="caption" color="text.secondary">{he.completionMediaHint}</Typography>
          <MediaCaptureActions
            photoAdded={Boolean(reportPhotoUrl)}
            videoAdded={Boolean(reportVideoUrl)}
            audioAdded={Boolean(reportAudioUrl)}
            uploadingKind={reportUploadingKind}
            disabled={reportSaving}
            onCapture={(file, kind) => handleReportUpload(file, kind)}
          />
          {!hasReportContent && (
            <Typography variant="caption" color="warning.main">{he.issueReportRequired}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3 }}>
          <Button onClick={() => setReportOpen(false)} disabled={reportSaving}>{he.cancel}</Button>
          <Button
            variant="contained"
            onClick={() => void handleReportSubmit()}
            disabled={reportSaving || reportUploadingKind !== null || !hasReportContent}
          >
            {reportSaving ? <CircularProgress size={22} color="inherit" /> : he.issueReportSubmit}
          </Button>
        </DialogActions>
      </Dialog>

      <EmployeeTaskDetailDialog
        task={detailTask}
        language={employeeLanguage}
        titleNode={detailTask ? <EmployeeTaskTitle task={detailTask} variant="h6" /> : null}
        onClose={closeDetail}
        capture={
          detailTask && canDoTask(detailTask.status)
            ? {
                slots: slotMedia,
                onSlotsChange: setSlotMedia,
                note,
                onNoteChange: setNote,
                onSubmit: () => void handleSubmit(),
                canSubmit: canSubmitEmployeeTask(
                  detailTask.status,
                  detailTask.start_url,
                  canSubmitDone,
                  linkedStartReady,
                ),
                saving,
              }
            : undefined
        }
        onChatUpdated={() => {
          void load();
          closeDetail();
          showSuccess(he.taskChatSent);
        }}
      />

    </Box>
  );
}
