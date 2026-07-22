import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
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
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { playTaskEndSound } from "../../utils/notificationSounds";
import {
  sortEmployeeOpenFocus,
  sortInProgressFocusFirst,
} from "../../utils/employeeTaskFocus";
import { employeeCardToOccurrence } from "../../utils/employeeTaskCard";
import TaskDateViewBar from "../../components/filters/TaskDateViewBar";
import {
  defaultRangeFrom,
  formatHebrewDay,
  groupTasksByDay,
  isToday,
  todayIso,
  type TaskDateViewMode,
} from "../../utils/dateView";
import { useTaskSpeech } from "../../hooks/useTaskSpeech";
import { resolveSpeechLanguage } from "../../utils/speechVoice";
import MediaCaptureActions, { type MediaKind } from "../../components/media/MediaCaptureActions";
import CompletionMediaPreview from "../../components/tasks/CompletionMediaPreview";
import EmployeeTaskDetailDialog from "../../components/tasks/EmployeeTaskDetailDialog";
import EmployeeTaskTitle from "../../components/tasks/EmployeeTaskTitle";
import TaskOccurrenceGrid from "../../components/tasks/TaskOccurrenceGrid";
import TaskReferenceMediaDisplay from "../../components/tasks/TaskReferenceMediaDisplay";
import { showsHebrewTitle } from "../../utils/employeeTaskCard";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import { he } from "../../i18n/he";
import {
  type PendingMedia,
  replacePendingMedia,
  revokePendingMedia,
  uploadPendingMedia,
} from "../../utils/pendingMedia";

function jobLabel(jobFunction: string | null | undefined): string {
  if (!jobFunction) return he.roleEmployee;
  const labels = he.jobFunctionLabels as Record<string, string>;
  return labels[jobFunction] ?? jobFunction;
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
    created_at: task.created_at,
    status: task.status,
    task_kind: task.task_kind,
    photo_required: task.photo_required,
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
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmployeeTaskCard | null>(null);
  const [detailTask, setDetailTask] = useState<EmployeeTaskCard | null>(null);
  const [note, setNote] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<PendingMedia | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingMedia | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingMedia | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportPhotoUrl, setReportPhotoUrl] = useState("");
  const [reportVideoUrl, setReportVideoUrl] = useState("");
  const [reportAudioUrl, setReportAudioUrl] = useState("");
  const [onBreak, setOnBreak] = useState(false);
  const [breakBusy, setBreakBusy] = useState(false);
  const [reportUploadingKind, setReportUploadingKind] = useState<"photo" | "video" | "audio" | null>(null);
  const [reportSaving, setReportSaving] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState(() => todayIso());
  const [dateViewMode, setDateViewMode] = useState<TaskDateViewMode>("day");
  const [filterFrom, setFilterFrom] = useState(() => todayIso());
  const [filterTo, setFilterTo] = useState(() => defaultRangeFrom(todayIso(), 7).to);
  const [rangeTasks, setRangeTasks] = useState<EmployeeTaskCard[]>([]);
  const [employeeLanguage, setEmployeeLanguage] = useState<EmployeeLanguage>("he");
  const [translatingTasks, setTranslatingTasks] = useState(false);
  const { speakingId, speak, stop: stopSpeech, supported: speechSupported } = useTaskSpeech(employeeLanguage);

  const translatePendingTasks = useCallback(
    async (language: EmployeeLanguage, tasks: EmployeeTaskCard[]) => {
      if (language === "he") return;
      const pendingIds = collectPendingIds(tasks, language);
      if (!pendingIds.length) return;
      setTranslatingTasks(true);
      try {
        const translations = await taskService.translateMine(pendingIds);
        if (dateViewMode === "day") {
          setDashboard((prev) => (prev ? mergeDashboardTranslations(prev, translations) : prev));
        } else {
          setRangeTasks((prev) => mergeTaskTranslations(prev, translations));
        }
      } catch {
        // Les tâches restent en hébreu si la traduction échoue.
      } finally {
        setTranslatingTasks(false);
      }
    },
    [dateViewMode]
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      if (dateViewMode === "day") {
        const [data, breakState] = await Promise.all([
          dashboardService.getEmployee(filterDay),
          employeeActivityService.getBreak().catch(() => ({ on_break: false, on_break_since: null })),
        ]);
        setDashboard(data);
        setOnBreak(Boolean(breakState.on_break));
        const lang = (data.employee.preferred_language as EmployeeLanguage) || "he";
        setEmployeeLanguage(lang);
        setRangeTasks([]);
        const allTasks = [
          ...data.urgent_tasks,
          ...data.in_progress_tasks,
          ...(data.awaiting_response_tasks ?? []),
          ...data.pending_review_tasks,
          ...data.today_tasks,
          ...data.completed_tasks,
        ];
        void translatePendingTasks(lang, allTasks);
      } else {
        const items = await taskService.listMine({ due_from: filterFrom, due_to: filterTo });
        const cards = items.map(toEmployeeCard);
        setRangeTasks(cards);
        setDashboard(null);
        const lang = (user?.preferred_language as EmployeeLanguage) || "he";
        setEmployeeLanguage(lang);
        void translatePendingTasks(lang, cards);
      }
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filterDay, filterFrom, filterTo, dateViewMode, translatePendingTasks, user?.preferred_language]);

  useEffect(() => {
    load();
  }, [load]);

  useTaskChangeListener(useCallback(() => {
    load(true);
  }, [load]));

  const handleStart = async (task: EmployeeTaskCard) => {
    setStartingId(task.id);
    try {
      const result = await taskService.start(task.id);
      const updated: EmployeeTaskCard = {
        ...task,
        status: result.occurrence?.status ?? "in_progress",
        started_at: result.occurrence?.started_at ?? new Date().toISOString(),
      };
      setDashboard((prev) => {
        if (!prev) return prev;
        const without = (list: EmployeeTaskCard[]) => list.filter((t) => t.id !== task.id);
        return {
          ...prev,
          on_shift: true,
          urgent_tasks: without(prev.urgent_tasks),
          today_tasks: without(prev.today_tasks),
          in_progress_tasks: [...without(prev.in_progress_tasks), updated],
        };
      });
      showSuccess(he.startTaskSuccess);
      await load(true);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setStartingId(null);
    }
  };

  const clearCompletionMedia = useCallback(() => {
    setPendingPhoto((prev) => {
      revokePendingMedia(prev);
      return null;
    });
    setPendingVideo((prev) => {
      revokePendingMedia(prev);
      return null;
    });
    setPendingAudio((prev) => {
      revokePendingMedia(prev);
      return null;
    });
  }, []);

  const openComplete = (task: EmployeeTaskCard) => {
    stopSpeech();
    clearCompletionMedia();
    setSelected(task);
    setNote("");
  };

  const handleListen = async (task: EmployeeTaskCard) => {
    if (!speechSupported) {
      showError(he.taskListenUnsupported);
      return;
    }
    const text = task.spoken_text || [task.title, task.description].filter(Boolean).join(". ");
    const speechLanguage = resolveSpeechLanguage(
      employeeLanguage,
      task.display_language,
      task.translation_pending
    );
    const ok = await speak(task.id, text, speechLanguage);
    if (!ok && speechLanguage === "ar") {
      showError(he.taskListenVoiceMissing);
    }
  };

  useEffect(() => {
    if (user?.preferred_language) {
      setEmployeeLanguage(user.preferred_language as EmployeeLanguage);
    }
  }, [user?.preferred_language]);

  const handleCapture = useCallback((file: File, kind: MediaKind) => {
    if (kind === "photo") {
      setPendingPhoto((prev) => replacePendingMedia(prev, file));
      return;
    }
    if (kind === "video") {
      setPendingVideo((prev) => replacePendingMedia(prev, file));
      return;
    }
    setPendingAudio((prev) => replacePendingMedia(prev, file));
  }, []);

  const hasVisualMedia = Boolean(pendingPhoto || pendingVideo);
  const requiresMedia = true;
  const canSubmitDone = hasVisualMedia;

  const openReport = () => {
    setReportText("");
    setReportPhotoUrl("");
    setReportVideoUrl("");
    setReportAudioUrl("");
    setReportOpen(true);
  };

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
    if (!selected) return;
    setSaving(true);
    try {
      const photo_path = await uploadPendingMedia(pendingPhoto, taskService.uploadPhoto);
      const video_path = await uploadPendingMedia(pendingVideo, taskService.uploadVideo);
      const audio_path = await uploadPendingMedia(pendingAudio, taskService.uploadAudio);
      await taskService.complete(selected.id, {
        status: "completed",
        note: note || undefined,
        photo_path,
        video_path,
        audio_path,
      });
      clearCompletionMedia();
      setSelected(null);
      playTaskEndSound();
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
      showSuccess(onBreak ? he.employeeBreakEnded : he.employeeBreakStarted);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setBreakBusy(false);
    }
  };

  const urgentTasks = useMemo(
    () => sortEmployeeOpenFocus(dashboard?.urgent_tasks ?? [], (dashboard?.in_progress_tasks ?? []).length > 0),
    [dashboard?.urgent_tasks, dashboard?.in_progress_tasks],
  );
  const inProgressTasks = useMemo(
    () => sortInProgressFocusFirst(dashboard?.in_progress_tasks ?? []),
    [dashboard?.in_progress_tasks],
  );
  const awaitingResponseTasks = dashboard?.awaiting_response_tasks ?? [];
  const pendingReviewTasks = dashboard?.pending_review_tasks ?? [];
  const todayTasks = useMemo(
    () => sortEmployeeOpenFocus(dashboard?.today_tasks ?? [], (dashboard?.in_progress_tasks ?? []).length > 0),
    [dashboard?.today_tasks, dashboard?.in_progress_tasks],
  );
  const completedTasks = dashboard?.completed_tasks ?? [];

  const progress = dashboard?.progress_percent ?? 0;
  const openCount =
    urgentTasks.length +
    todayTasks.length +
    inProgressTasks.length +
    awaitingResponseTasks.length;
  const dayTasksLabel = isToday(filterDay)
    ? he.employeeTodayTasks
    : `${he.tasksForSelectedDay} · ${formatHebrewDay(filterDay)}`;

  const rangeGroups = useMemo(() => groupTasksByDay(rangeTasks), [rangeTasks]);
  const rangeInProgress = useMemo(
    () => sortInProgressFocusFirst(rangeTasks.filter((t) => t.status === "in_progress")),
    [rangeTasks],
  );

  const cardById = useMemo(() => {
    const map = new Map<string, EmployeeTaskCard>();
    for (const task of [
      ...urgentTasks,
      ...inProgressTasks,
      ...awaitingResponseTasks,
      ...pendingReviewTasks,
      ...todayTasks,
      ...completedTasks,
      ...rangeTasks,
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
    rangeTasks,
  ]);

  const withCard = (occ: TaskOccurrence, fn: (card: EmployeeTaskCard) => void) => {
    const card = cardById.get(occ.id);
    if (card) fn(card);
  };

  const employeeGridProps = {
    layout: "stack" as const,
    startingId,
    speakingId: speakingId ?? null,
    onOpen: (occ: TaskOccurrence) => withCard(occ, setDetailTask),
    onStart: (occ: TaskOccurrence) => withCard(occ, (c) => void handleStart(c)),
    onComplete: (occ: TaskOccurrence) => withCard(occ, openComplete),
    onListen: speechSupported
      ? (occ: TaskOccurrence) => withCard(occ, (c) => void handleListen(c))
      : undefined,
    onStopListen: speechSupported ? stopSpeech : undefined,
    onChatUpdated: () => {
      void load();
      showSuccess(he.taskChatSent);
    },
  };

  const headerName = dashboard?.employee?.full_name ?? user?.full_name;
  const headerBranch = dashboard?.employee?.branch_name;
  const headerJob = dashboard?.employee?.job_function;
  const onShift = dateViewMode === "day" ? dashboard?.on_shift : rangeInProgress.length > 0;

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", pb: 14, px: { xs: 1, sm: 2 } }}>
      <Box
        mb={2.5}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)",
        }}
      >
        <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">{headerName}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {headerBranch ? `${he.branch}: ${headerBranch}` : ""}
          {headerJob ? ` · ${jobLabel(headerJob)}` : ""}
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 1.25 }}>
          <Chip
            size="small"
            color={onBreak ? "warning" : onShift ? "success" : "default"}
            label={
              onBreak ? he.employeeOnBreak : onShift ? he.employeeOnShift : he.employeeOffShift
            }
          />
          <Button
            size="small"
            variant={onBreak ? "contained" : "outlined"}
            color={onBreak ? "warning" : "primary"}
            disabled={breakBusy}
            onClick={() => void handleToggleBreak()}
          >
            {onBreak ? he.employeeBreakEnd : he.employeeBreakStart}
          </Button>
        </Box>
      </Box>

      <TaskDateViewBar
        mode={dateViewMode}
        onModeChange={setDateViewMode}
        day={filterDay}
        onDayChange={setFilterDay}
        rangeFrom={filterFrom}
        rangeTo={filterTo}
        onRangeChange={(from, to) => {
          setFilterFrom(from);
          setFilterTo(to);
        }}
      />

      {dateViewMode === "day" && (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" mb={1}>{he.employeeDailyProgress}</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <LinearProgress variant="determinate" value={progress} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
          <Typography fontWeight={800}>{progress}%</Typography>
        </Box>
      </Paper>
      )}

      {translatingTasks && (
        <Alert severity="info" sx={{ mb: 2 }}>{he.taskTranslating}</Alert>
      )}

      {loading ? (
        <ListSkeleton variant="cards" rows={3} />
      ) : dateViewMode === "range" ? (
        <>
          {rangeInProgress.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} mb={1}>{he.tasksInProgress}</Typography>
              <TaskOccurrenceGrid
                tasks={rangeInProgress.map(employeeCardToOccurrence)}
                {...employeeGridProps}
              />
            </Box>
          )}
          {rangeGroups.length === 0 ? (
            <EmptyState
              title={he.noTasks}
              description={he.noTasksHint}
              icon={<TaskAltOutlinedIcon fontSize="inherit" />}
              compact
            />
          ) : (
            rangeGroups.map(([day, dayTasks]) => {
              const open = sortEmployeeOpenFocus(
                dayTasks.filter(
                  (t) =>
                    t.status !== "completed" &&
                    t.status !== "cancelled" &&
                    t.status !== "in_progress",
                ),
                rangeInProgress.length > 0,
              );
              const done = dayTasks.filter((t) => t.status === "completed");
              return (
                <Box key={day} mb={3}>
                  <Typography variant="subtitle1" fontWeight={800} mb={1}>
                    {isToday(day) ? he.tasksTodayLabel : formatHebrewDay(day)}
                  </Typography>
                  {open.length === 0 && done.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" mb={1}>{he.noTasks}</Typography>
                  ) : open.length > 0 ? (
                    <TaskOccurrenceGrid
                      tasks={open.map(employeeCardToOccurrence)}
                      {...employeeGridProps}
                    />
                  ) : null}
                  {done.length > 0 && (
                    <Box mt={open.length ? 2 : 0}>
                      <TaskOccurrenceGrid tasks={done.map(employeeCardToOccurrence)} onOpen={employeeGridProps.onOpen} />
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </>
      ) : (
        <>
          {inProgressTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} mb={1}>{he.tasksInProgress}</Typography>
              <TaskOccurrenceGrid
                tasks={inProgressTasks.map(employeeCardToOccurrence)}
                {...employeeGridProps}
              />
            </Box>
          )}

          {awaitingResponseTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color="warning.main" mb={1}>
                {he.employeeAwaitingResponseTasks}
              </Typography>
              <TaskOccurrenceGrid
                tasks={awaitingResponseTasks.map(employeeCardToOccurrence)}
                {...employeeGridProps}
              />
            </Box>
          )}

          {urgentTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color="error.main" mb={1}>
                {he.employeeUrgentTasks}
              </Typography>
              <TaskOccurrenceGrid
                tasks={urgentTasks.map(employeeCardToOccurrence)}
                urgentIds={new Set(urgentTasks.map((t) => t.id))}
                {...employeeGridProps}
              />
            </Box>
          )}

          {pendingReviewTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} mb={1}>{he.taskPendingReview}</Typography>
              <TaskOccurrenceGrid
                tasks={pendingReviewTasks.map(employeeCardToOccurrence)}
                onOpen={employeeGridProps.onOpen}
              />
            </Box>
          )}

          <Typography variant="subtitle1" fontWeight={800} mb={1}>{dayTasksLabel}</Typography>
          {openCount === 0 ? (
            <EmptyState
              title={he.noTasksToday}
              description={he.noTasksHint}
              icon={<TaskAltOutlinedIcon fontSize="inherit" />}
              compact
            />
          ) : todayTasks.length > 0 ? (
            <TaskOccurrenceGrid
              tasks={todayTasks.map(employeeCardToOccurrence)}
              {...employeeGridProps}
            />
          ) : null}

          {completedTasks.length > 0 && (
            <Accordion expanded={showCompleted} onChange={() => setShowCompleted((v) => !v)} sx={{ mt: 2, boxShadow: 0, border: 1, borderColor: "divider" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700}>
                  {showCompleted ? he.employeeHideCompleted : he.employeeShowCompleted} ({completedTasks.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <TaskOccurrenceGrid
                  tasks={completedTasks.map(employeeCardToOccurrence)}
                  onOpen={employeeGridProps.onOpen}
                />
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}

      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          bottom: 16,
          left: 16,
          right: 16,
          maxWidth: 520,
          mx: "auto",
          zIndex: (t) => t.zIndex.fab,
          borderRadius: 3,
          p: 1.25,
          display: "flex",
          gap: 1,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          color="warning"
          startIcon={<ReportProblemIcon />}
          onClick={openReport}
          sx={{ borderRadius: 2.5, py: 1.1 }}
        >
          {he.employeeReportIssue}
        </Button>
      </Paper>

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
        <DialogActions sx={{ px: 3, pb: 2 }}>
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
        titleNode={detailTask ? <EmployeeTaskTitle task={detailTask} variant="h6" /> : null}
        onClose={() => setDetailTask(null)}
        starting={detailTask ? startingId === detailTask.id : false}
        onStart={
          detailTask
            ? () => {
                void handleStart(detailTask);
                setDetailTask(null);
              }
            : undefined
        }
        onComplete={
          detailTask
            ? () => {
                openComplete(detailTask);
                setDetailTask(null);
              }
            : undefined
        }
        onChatUpdated={() => {
          void load();
          setDetailTask(null);
          showSuccess(he.taskChatSent);
        }}
      />

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle sx={{ pb: selected && showsHebrewTitle(selected) ? 1 : undefined }}>
          {selected ? <EmployeeTaskTitle task={selected} variant="h6" /> : null}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {selected && (
            <TaskReferenceMediaDisplay
              reference_photo_url={selected.reference_photo_url}
              reference_video_url={selected.reference_video_url}
              reference_audio_url={selected.reference_audio_url}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            {he.taskChatHint}
          </Typography>
          <TextField label={he.note} value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline rows={3} placeholder={he.completionMediaHint} />
          <Typography variant="caption" color="text.secondary">{he.completionMediaHint}</Typography>
          <MediaCaptureActions
            photoAdded={Boolean(pendingPhoto)}
            videoAdded={Boolean(pendingVideo)}
            audioAdded={Boolean(pendingAudio)}
            uploadingKind={null}
            disabled={saving}
            onCapture={(file, kind: MediaKind) => handleCapture(file, kind)}
          />
          <CompletionMediaPreview
            photo_path={pendingPhoto?.previewUrl}
            video_path={pendingVideo?.previewUrl}
            audio_path={pendingAudio?.previewUrl}
            disabled={saving}
            onRemovePhoto={() => {
              revokePendingMedia(pendingPhoto);
              setPendingPhoto(null);
            }}
            onRemoveVideo={() => {
              revokePendingMedia(pendingVideo);
              setPendingVideo(null);
            }}
            onRemoveAudio={() => {
              revokePendingMedia(pendingAudio);
              setPendingAudio(null);
            }}
          />
          {requiresMedia && !hasVisualMedia && (
            <Typography variant="caption" color="warning.main">{he.photoRequired}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              clearCompletionMedia();
              setSelected(null);
            }}
            disabled={saving}
          >
            {he.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={saving || !canSubmitDone}
          >
            {saving ? <CircularProgress size={22} color="inherit" /> : he.submit}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
