import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import StopIcon from "@mui/icons-material/Stop";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { ApiError } from "../../services/api";
import {
  dashboardService,
  type EmployeeDashboard,
  type EmployeeTaskCard,
} from "../../services/dashboardService";
import { taskService, type TaskStatus, type TaskTranslation, type TaskOccurrence } from "../../services/taskService";
import { issueReportService } from "../../services/issueReportService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import TaskDateViewBar from "../../components/filters/TaskDateViewBar";
import {
  defaultRangeFrom,
  formatHebrewDay,
  formatDueAt,
  groupTasksByDay,
  isToday,
  todayIso,
  type TaskDateViewMode,
} from "../../utils/dateView";
import { useTaskSpeech } from "../../hooks/useTaskSpeech";
import { resolveSpeechLanguage } from "../../utils/speechVoice";
import MediaCaptureActions, { type MediaKind } from "../../components/media/MediaCaptureActions";
import CompletionMediaPreview from "../../components/tasks/CompletionMediaPreview";
import TaskReferenceMediaDisplay from "../../components/tasks/TaskReferenceMediaDisplay";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import { he } from "../../i18n/he";

const statusColor: Record<TaskStatus, "default" | "warning" | "success" | "error" | "info"> = {
  pending: "warning",
  in_progress: "warning",
  pending_review: "info",
  completed: "success",
  overdue: "error",
  cancelled: "default",
};

function jobLabel(jobFunction: string | null | undefined): string {
  if (!jobFunction) return he.roleEmployee;
  const labels = he.jobFunctionLabels as Record<string, string>;
  return labels[jobFunction] ?? jobFunction;
}

function showsHebrewTitle(task: EmployeeTaskCard): boolean {
  return Boolean(
    task.title_he &&
      task.title_he !== task.title &&
      task.display_language &&
      task.display_language !== "he"
  );
}

function EmployeeTaskTitle({
  task,
  variant = "h6",
  fontWeight = 700,
}: {
  task: EmployeeTaskCard;
  variant?: "h6" | "body1";
  fontWeight?: number | string;
}) {
  return (
    <Box>
      <Typography variant={variant} fontWeight={fontWeight}>{task.title}</Typography>
      {showsHebrewTitle(task) && (
        <Typography variant="body2" color="text.secondary" dir="rtl" sx={{ mt: 0.25 }}>
          {he.taskTitleHebrew}: {task.title_he}
        </Typography>
      )}
    </Box>
  );
}

function TaskCard({
  task,
  urgent,
  starting,
  speaking,
  onStart,
  onComplete,
  onListen,
  onStopListen,
}: {
  task: EmployeeTaskCard;
  urgent?: boolean;
  starting?: boolean;
  speaking?: boolean;
  onStart: (task: EmployeeTaskCard) => void;
  onComplete: (task: EmployeeTaskCard) => void;
  onListen: (task: EmployeeTaskCard) => void;
  onStopListen: () => void;
}) {
  const rejectionNote = task.completion?.rejection_note;
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderColor: urgent ? "error.light" : undefined,
        bgcolor: urgent ? "rgba(211, 47, 47, 0.06)" : undefined,
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
          <EmployeeTaskTitle task={task} />
          <Chip label={he.taskStatusLabels[task.status]} color={statusColor[task.status]} size="small" />
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
          <Chip label={he.taskKindLabels[task.task_kind]} size="small" />
          {task.department_name && <Chip label={task.department_name} size="small" variant="outlined" />}
          {urgent && <Chip label={he.employeeUrgentTasks} color="error" size="small" />}
        </Box>
        {task.description && (
          <Typography variant="body2" color="text.secondary" mb={1}>{task.description}</Typography>
        )}
        <TaskReferenceMediaDisplay
          reference_photo_url={task.reference_photo_url}
          reference_video_url={task.reference_video_url}
          reference_audio_url={task.reference_audio_url}
        />
        <Typography variant="caption" color="text.secondary" dir="ltr" display="block">
          {he.dueAt}: {formatDueAt(task.due_at)}
        </Typography>
        {task.photo_required && (
          <Typography variant="caption" color="warning.main" display="block">{he.photoRequired}</Typography>
        )}
        {rejectionNote && (
          <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
            {he.taskRejectedReopen}: {rejectionNote}
          </Alert>
        )}
        <Button
          size="small"
          variant="text"
          startIcon={speaking ? <StopIcon /> : <VolumeUpIcon />}
          onClick={() => (speaking ? onStopListen() : onListen(task))}
          sx={{ mt: 1, alignSelf: "flex-start" }}
        >
          {speaking ? he.taskListenStop : he.taskListen}
        </Button>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, flexDirection: "column", gap: 1 }}>
        {(task.status === "pending" || task.status === "overdue") && (
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={starting ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            onClick={() => onStart(task)}
            disabled={starting}
          >
            {he.startTask}
          </Button>
        )}
        {task.status === "in_progress" && (
          <Button fullWidth variant="contained" color="success" size="large" onClick={() => onComplete(task)}>
            {he.markDone}
          </Button>
        )}
      </CardActions>
    </Card>
  );
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
    status: task.status,
    task_kind: task.task_kind,
    photo_required: task.photo_required,
    reference_photo_url: task.reference_photo_url ?? null,
    reference_video_url: task.reference_video_url ?? null,
    reference_audio_url: task.reference_audio_url ?? null,
    department_name: task.department_name ?? null,
    started_at: task.started_at,
    spoken_text: (task as TaskOccurrence & { spoken_text?: string }).spoken_text,
    display_language: (task as TaskOccurrence & { display_language?: string }).display_language,
    translation_pending: (task as TaskOccurrence & { translation_pending?: boolean }).translation_pending,
    title_he: (task as TaskOccurrence & { title_he?: string }).title_he,
    completion: task.completion ?? null,
  };
}

export default function EmployeeTasksPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmployeeTaskCard | null>(null);
  const [note, setNote] = useState("");
  const [notDoneReason, setNotDoneReason] = useState("");
  const [done, setDone] = useState(true);
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [uploadingKind, setUploadingKind] = useState<"photo" | "video" | "audio" | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportPhotoUrl, setReportPhotoUrl] = useState("");
  const [reportVideoUrl, setReportVideoUrl] = useState("");
  const [reportAudioUrl, setReportAudioUrl] = useState("");
  const [reportUploadingKind, setReportUploadingKind] = useState<"photo" | "video" | "audio" | null>(null);
  const [reportSaving, setReportSaving] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [filterDay, setFilterDay] = useState(todayIso);
  const [dateViewMode, setDateViewMode] = useState<TaskDateViewMode>("day");
  const [filterFrom, setFilterFrom] = useState(todayIso);
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
      setError("");
    }
    try {
      if (dateViewMode === "day") {
        const data = await dashboardService.getEmployee(filterDay);
        setDashboard(data);
        const lang = (data.employee.preferred_language as EmployeeLanguage) || "he";
        setEmployeeLanguage(lang);
        setRangeTasks([]);
        const allTasks = [
          ...data.urgent_tasks,
          ...data.in_progress_tasks,
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
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
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
    setError("");
    setSuccess("");
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
      setSuccess(he.startTaskSuccess);
      await load(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setStartingId(null);
    }
  };

  const openComplete = (task: EmployeeTaskCard) => {
    stopSpeech();
    setSelected(task);
    setNote("");
    setNotDoneReason("");
    setDone(true);
    setPhotoUrl("");
    setVideoUrl("");
    setAudioUrl("");
  };

  const handleListen = async (task: EmployeeTaskCard) => {
    if (!speechSupported) {
      setError(he.taskListenUnsupported);
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
      setError(he.taskListenVoiceMissing);
    }
  };

  useEffect(() => {
    if (user?.preferred_language) {
      setEmployeeLanguage(user.preferred_language as EmployeeLanguage);
    }
  }, [user?.preferred_language]);

  const handleUpload = useCallback(async (file: File, kind: MediaKind) => {
    setUploadingKind(kind);
    setError("");
    try {
      const res =
        kind === "photo"
          ? await taskService.uploadPhoto(file)
          : kind === "video"
            ? await taskService.uploadVideo(file)
            : await taskService.uploadAudio(file);
      if (kind === "photo") setPhotoUrl(res.url);
      if (kind === "video") setVideoUrl(res.url);
      if (kind === "audio") setAudioUrl(res.url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setUploadingKind(null);
    }
  }, []);

  const hasMedia = Boolean(photoUrl || videoUrl || audioUrl);
  const requiresMedia = Boolean(selected?.photo_required && done);
  const canSubmitDone = !requiresMedia || hasMedia;

  const openReport = () => {
    setReportText("");
    setReportPhotoUrl("");
    setReportVideoUrl("");
    setReportAudioUrl("");
    setReportOpen(true);
  };

  const handleReportUpload = useCallback(async (file: File, kind: MediaKind) => {
    setReportUploadingKind(kind);
    setError("");
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
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
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
    setError("");
    try {
      await issueReportService.createReport({
        text: reportText.trim() || undefined,
        photo_url: reportPhotoUrl || undefined,
        video_url: reportVideoUrl || undefined,
        audio_url: reportAudioUrl || undefined,
      });
      setReportOpen(false);
      setSuccess(he.issueReportSuccess);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setReportSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await taskService.complete(selected.id, {
        status: done ? "completed" : "not_completed",
        note: note || undefined,
        photo_path: photoUrl || undefined,
        video_path: videoUrl || undefined,
        audio_path: audioUrl || undefined,
        not_completed_reason: done ? undefined : notDoneReason,
      });
      setSelected(null);
      if (done) {
        setSuccess(he.taskSubmitSuccess);
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const urgentTasks = dashboard?.urgent_tasks ?? [];
  const inProgressTasks = dashboard?.in_progress_tasks ?? [];
  const pendingReviewTasks = dashboard?.pending_review_tasks ?? [];
  const todayTasks = dashboard?.today_tasks ?? [];
  const completedTasks = dashboard?.completed_tasks ?? [];

  const progress = dashboard?.progress_percent ?? 0;
  const openCount = urgentTasks.length + todayTasks.length + inProgressTasks.length;
  const dayTasksLabel = isToday(filterDay)
    ? he.employeeTodayTasks
    : `${he.tasksForSelectedDay} · ${formatHebrewDay(filterDay)}`;

  const rangeGroups = useMemo(() => groupTasksByDay(rangeTasks), [rangeTasks]);
  const rangeInProgress = useMemo(
    () => rangeTasks.filter((t) => t.status === "in_progress"),
    [rangeTasks]
  );

  const headerName = dashboard?.employee?.full_name ?? user?.full_name;
  const headerBranch = dashboard?.employee?.branch_name;
  const headerJob = dashboard?.employee?.job_function;
  const onShift = dateViewMode === "day" ? dashboard?.on_shift : rangeInProgress.length > 0;

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", pb: 12 }}>
      <Box mb={2}>
        <Typography variant="h5" fontWeight={800}>{headerName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {headerBranch ? `${he.branch}: ${headerBranch}` : ""}
          {headerJob ? ` · ${jobLabel(headerJob)}` : ""}
        </Typography>
        <Chip
          size="small"
          color={onShift ? "success" : "default"}
          label={onShift ? he.employeeOnShift : he.employeeOffShift}
          sx={{ mt: 1 }}
        />
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

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {translatingTasks && (
        <Alert severity="info" sx={{ mb: 2 }}>{he.taskTranslating}</Alert>
      )}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : dateViewMode === "range" ? (
        <>
          {rangeInProgress.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} mb={1}>{he.tasksInProgress}</Typography>
              {rangeInProgress.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  starting={startingId === task.id}
                  speaking={speakingId === task.id}
                  onStart={handleStart}
                  onComplete={openComplete}
                  onListen={handleListen}
                  onStopListen={stopSpeech}
                />
              ))}
            </Box>
          )}
          {rangeGroups.length === 0 ? (
            <Alert severity="success">{he.noTasks}</Alert>
          ) : (
            rangeGroups.map(([day, dayTasks]) => {
              const open = dayTasks.filter(
                (t) => t.status !== "completed" && t.status !== "cancelled" && t.status !== "in_progress"
              );
              const done = dayTasks.filter((t) => t.status === "completed");
              return (
                <Box key={day} mb={3}>
                  <Typography variant="subtitle1" fontWeight={800} mb={1}>
                    {isToday(day) ? he.tasksTodayLabel : formatHebrewDay(day)}
                  </Typography>
                  {open.length === 0 && done.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" mb={1}>{he.noTasks}</Typography>
                  ) : (
                    open.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        starting={startingId === task.id}
                        speaking={speakingId === task.id}
                        onStart={handleStart}
                        onComplete={openComplete}
                        onListen={handleListen}
                        onStopListen={stopSpeech}
                      />
                    ))
                  )}
                  {done.map((task) => (
                    <Card key={task.id} variant="outlined" sx={{ mb: 1, opacity: 0.85 }}>
                      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <EmployeeTaskTitle task={task} variant="body1" fontWeight={600} />
                        <Chip label={he.taskCompleted} color="success" size="small" sx={{ mt: 0.5 }} />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              );
            })
          )}
        </>
      ) : (
        <>
          {urgentTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color="error.main" mb={1}>
                {he.employeeUrgentTasks}
              </Typography>
              {urgentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  urgent
                  starting={startingId === task.id}
                  speaking={speakingId === task.id}
                  onStart={handleStart}
                  onComplete={openComplete}
                  onListen={handleListen}
                  onStopListen={stopSpeech}
                />
              ))}
            </Box>
          )}

          {inProgressTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} mb={1}>{he.tasksInProgress}</Typography>
              {inProgressTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  starting={startingId === task.id}
                  speaking={speakingId === task.id}
                  onStart={handleStart}
                  onComplete={openComplete}
                  onListen={handleListen}
                  onStopListen={stopSpeech}
                />
              ))}
            </Box>
          )}

          {pendingReviewTasks.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={800} mb={1}>{he.taskPendingReview}</Typography>
              {pendingReviewTasks.map((task) => (
                <Card key={task.id} variant="outlined" sx={{ mb: 2, opacity: 0.9 }}>
                  <CardContent>
                    <EmployeeTaskTitle task={task} />
                    <Chip label={he.taskStatusLabels.pending_review} color="info" size="small" sx={{ mt: 1 }} />
                    {task.completion && (
                      <CompletionMediaPreview
                        viewer="employee"
                        photo_path={task.completion.photo_path}
                        video_path={task.completion.video_path}
                        audio_path={task.completion.audio_path}
                        audio_transcript={task.completion.audio_transcript}
                        audio_transcript_employee={task.completion.audio_transcript_employee}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          <Typography variant="subtitle1" fontWeight={800} mb={1}>{dayTasksLabel}</Typography>
          {openCount === 0 && completedTasks.length > 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>{he.noTasksToday}</Alert>
          ) : openCount === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>{he.noTasksToday}</Alert>
          ) : (
            todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                starting={startingId === task.id}
                speaking={speakingId === task.id}
                onStart={handleStart}
                onComplete={openComplete}
                onListen={handleListen}
                onStopListen={stopSpeech}
              />
            ))
          )}

          {completedTasks.length > 0 && (
            <Accordion expanded={showCompleted} onChange={() => setShowCompleted((v) => !v)} sx={{ mt: 2, boxShadow: 0, border: 1, borderColor: "divider" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700}>
                  {showCompleted ? he.employeeHideCompleted : he.employeeShowCompleted} ({completedTasks.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {completedTasks.map((task) => (
                  <Card key={task.id} variant="outlined" sx={{ mb: 1, opacity: 0.85 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography fontWeight={600}>{task.title}</Typography>
                      <Chip label={he.taskCompleted} color="success" size="small" sx={{ mt: 0.5 }} />
                    </CardContent>
                  </Card>
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}

      <Fab
        color="secondary"
        variant="extended"
        sx={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)" }}
        onClick={openReport}
      >
        <ReportProblemIcon sx={{ ml: 1 }} />
        {he.employeeReportIssue}
      </Fab>

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

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle sx={{ pb: selected && showsHebrewTitle(selected) ? 1 : undefined }}>
          {selected ? <EmployeeTaskTitle task={selected} variant="h6" /> : null}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Button variant={done ? "contained" : "outlined"} color="success" size="large" onClick={() => setDone(true)}>{he.taskCompleted}</Button>
          <Button variant={!done ? "contained" : "outlined"} color="warning" size="large" onClick={() => setDone(false)}>{he.taskNotCompleted}</Button>
          {!done && (
            <TextField label={he.notCompletedReason} value={notDoneReason} onChange={(e) => setNotDoneReason(e.target.value)} required fullWidth multiline rows={2} />
          )}
          <TextField label={he.note} value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline rows={3} placeholder={he.completionMediaHint} />
          {done && (
            <>
              <Typography variant="caption" color="text.secondary">{he.completionMediaHint}</Typography>
              <MediaCaptureActions
                photoAdded={Boolean(photoUrl)}
                videoAdded={Boolean(videoUrl)}
                audioAdded={Boolean(audioUrl)}
                uploadingKind={uploadingKind}
                disabled={saving}
                onCapture={(file, kind: MediaKind) => handleUpload(file, kind)}
              />
              <CompletionMediaPreview
                photo_path={photoUrl}
                video_path={videoUrl}
                audio_path={audioUrl}
                disabled={saving || uploadingKind !== null}
                onRemovePhoto={() => setPhotoUrl("")}
                onRemoveVideo={() => setVideoUrl("")}
                onRemoveAudio={() => setAudioUrl("")}
              />
              {requiresMedia && !hasMedia && (
                <Typography variant="caption" color="warning.main">{he.photoRequired}</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelected(null)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving || uploadingKind !== null || (!done && !notDoneReason.trim()) || !canSubmitDone}>
            {saving ? <CircularProgress size={22} color="inherit" /> : he.submit}
          </Button>
        </DialogActions>
      </Dialog>

      {selected && (
        <Fab color="primary" sx={{ position: "fixed", bottom: 88, left: 24 }} onClick={handleSubmit} disabled={saving || uploadingKind !== null || !canSubmitDone}>
          <CheckIcon />
        </Fab>
      )}
    </Box>
  );
}
