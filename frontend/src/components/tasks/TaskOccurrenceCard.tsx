import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RateReviewIcon from "@mui/icons-material/RateReview";
import StopIcon from "@mui/icons-material/Stop";
import ChatIcon from "@mui/icons-material/Chat";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import TaskStatusChip from "./TaskStatusChip";
import TaskChatPanel from "./TaskChatPanel";
import { taskStatusVisual } from "../../constants/taskStatusVisual";
import { he } from "../../i18n/he";
import { dueDateIso, formatDueAt, formatHebrewDayShort } from "../../utils/dateView";
import { isManagerNextTask } from "../../utils/employeeTaskFocus";
import { showsHebrewTitle } from "../../utils/employeeTaskCard";
import { isNativeApp } from "../../utils/isNativeApp";
import { mediaUrl } from "../../utils/mediaUrl";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { taskCardBackgroundUrl } from "../../utils/taskCardBackground";
import { taskUrgencyLevel, type TaskUrgencyLevel } from "../../utils/taskUrgency";
import type { TaskOccurrence } from "../../services/taskService";

export interface TaskOccurrenceCardProps {
  task: TaskOccurrence;
  index?: number;
  isBranchManager?: boolean;
  /** Mise en avant (urgent oved). */
  urgent?: boolean;
  onEdit?: (task: TaskOccurrence) => void;
  onCancel?: (task: TaskOccurrence) => void;
  onReview?: (task: TaskOccurrence) => void;
  onSetManagerNext?: (task: TaskOccurrence, enabled: boolean) => void;
  /** Actions oved (même carte visuelle). */
  onOpen?: (task: TaskOccurrence) => void;
  onStart?: (task: TaskOccurrence) => void;
  onComplete?: (task: TaskOccurrence) => void;
  onListen?: (task: TaskOccurrence) => void;
  onStopListen?: () => void;
  onChatUpdated?: (task: TaskOccurrence, status: string) => void;
  starting?: boolean;
  speaking?: boolean;
  titleNode?: ReactNode;
  /** @deprecated Déplacé vers l'édition (שיוך → גלריה). Conservé pour compat. */
  onAddToGallery?: (task: TaskOccurrence) => void;
}

const URGENCY_COLOR: Record<TaskUrgencyLevel, "error" | "warning" | "default" | "success"> = {
  overdue: "error",
  soon: "warning",
  normal: "default",
  done: "success",
};

function isCarryOver(task: TaskOccurrence): boolean {
  return Boolean(task.created_at && dueDateIso(task.created_at) < dueDateIso(task.due_at));
}

export default function TaskOccurrenceCard({
  task,
  index = 0,
  urgent = false,
  onEdit,
  onCancel,
  onReview,
  onSetManagerNext,
  onOpen,
  onStart,
  onComplete,
  onListen,
  onStopListen,
  onChatUpdated,
  starting = false,
  speaking = false,
  titleNode,
}: TaskOccurrenceCardProps) {
  const isNative = isNativeApp();
  const visual = taskStatusVisual(task.status);
  const photoBg = taskCardBackgroundUrl(task.reference_photo_url);
  const videoSrc = mediaUrl(task.reference_video_url ?? null);
  const audioSrc = mediaUrl(task.reference_audio_url ?? null);
  const urgency = taskUrgencyLevel(task.status, task.due_at);
  const carryOver = isCarryOver(task);
  const [photoReady, setPhotoReady] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  /** הוראות + צ׳אט (oved) : fermés par défaut. */
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);

  useEffect(() => {
    setPhotoReady(false);
    if (!photoBg) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    const start = () => {
      img.onload = () => {
        if (!cancelled) setPhotoReady(true);
      };
      img.onerror = () => {
        if (!cancelled) setPhotoReady(false);
      };
      img.src = photoBg;
    };
    const t = window.setTimeout(start, isNative ? 80 + Math.min(index, 8) * 40 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [photoBg, isNative, index]);

  const showPhoto = Boolean(photoBg && photoReady);
  const awaitingReview = task.status === "pending_review";
  const canCancel = !["completed", "cancelled"].includes(task.status) && Boolean(onCancel);
  /** Édition menahel : autorisée sauf terminé / annulé / en revue photo. */
  const canEdit =
    Boolean(onEdit) &&
    !["completed", "cancelled", "pending_review"].includes(task.status);
  const canReview = awaitingReview && Boolean(onReview);
  const canMarkNext =
    Boolean(onSetManagerNext) &&
    Boolean(task.assignee_user_id) &&
    !["completed", "cancelled", "pending_review"].includes(task.status);
  const canStart =
    Boolean(onStart) && (task.status === "pending" || task.status === "overdue");
  const canComplete = Boolean(onComplete) && task.status === "in_progress";
  const hasTextInstructions = Boolean(
    (task.description || "").trim() || audioSrc || task.spoken_text,
  );
  const isEmployeeMode = Boolean(onOpen || onStart || onComplete);
  const showMenu = (!isEmployeeMode && Boolean(onEdit)) || canCancel;
  const composeEnabled = canComposeTaskChat(task.status, isEmployeeMode);

  const closeMenu = () => {
    setMenuAnchor(null);
    setDeleteArmed(false);
  };

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 3,
        border: "2px solid",
        borderColor: urgent || carryOver ? visual.bar : visual.border,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        transition: "box-shadow 0.2s, transform 0.15s, border-color 0.15s",
        overflow: "hidden",
        opacity: task.status === "cancelled" ? 0.72 : 1,
        "&:hover": {
          boxShadow: 4,
          transform: "translateY(-3px)",
          borderColor: visual.bar,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          minHeight: { xs: 280, sm: 200 },
          height: "100%",
        }}
      >
        <Box
          sx={{
            flex: { xs: "0 0 auto", sm: "1 1 48%" },
            minHeight: { xs: 180, sm: 240 },
            height: { xs: 180, sm: "auto" },
            bgcolor: visual.surface,
            position: "relative",
            overflow: "hidden",
            borderInlineEnd: { sm: "1px solid" },
            borderBottom: { xs: "1px solid", sm: "none" },
            borderColor: "divider",
          }}
        >
          {showPhoto ? (
            <Box
              component="button"
              type="button"
              aria-label={he.taskPhotoEnlarge}
              onClick={() => setPhotoLightboxOpen(true)}
              sx={{
                position: "absolute",
                inset: 0,
                border: 0,
                p: 0,
                m: 0,
                cursor: "zoom-in",
                display: "block",
                width: "100%",
                height: "100%",
                bgcolor: "transparent",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${photoBg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(18px)",
                  transform: "scale(1.12)",
                  opacity: 0.55,
                }}
              />
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(15,23,42,0.18)",
                }}
              />
              <Box
                component="img"
                src={photoBg}
                alt=""
                sx={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
              <ZoomOutMapIcon
                sx={{
                  position: "absolute",
                  zIndex: 2,
                  insetInlineEnd: 8,
                  bottom: 8,
                  color: "#fff",
                  opacity: 0.85,
                  fontSize: 20,
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                height: "100%",
                minHeight: { xs: 180, sm: 240 },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: visual.surface,
              }}
            >
              <Typography variant="h3" fontWeight={800} sx={{ color: visual.bar, opacity: 0.35 }}>
                {task.title.trim()[0]?.toUpperCase() ?? "?"}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              position: "absolute",
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: 4,
              bgcolor: visual.bar,
              zIndex: 3,
              pointerEvents: "none",
            }}
          />
        </Box>

        <Box
          sx={{
            flex: { xs: "1 1 auto", sm: "1 1 50%" },
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            minWidth: 0,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {titleNode ?? (
                <>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.35 }}>
                    {task.title}
                  </Typography>
                  {showsHebrewTitle(task) && (
                    <Typography variant="body2" color="text.secondary" dir="rtl" sx={{ mt: 0.25 }}>
                      {he.taskTitleHebrew}: {task.title_he}
                    </Typography>
                  )}
                </>
              )}
            </Box>
            {showMenu && (
              <>
                <IconButton
                  size="small"
                  aria-label={he.taskMenuMore}
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  sx={{ mt: -0.5, me: -0.5 }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={closeMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {canEdit && onEdit && (
                    <MenuItem
                      onClick={() => {
                        closeMenu();
                        onEdit(task);
                      }}
                    >
                      <EditIcon fontSize="small" sx={{ me: 1 }} />
                      {he.editTask}
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      closeMenu();
                      setInfoOpen(true);
                    }}
                  >
                    <InfoOutlinedIcon fontSize="small" sx={{ me: 1 }} />
                    {he.taskInfo}
                  </MenuItem>
                  {canCancel && onCancel && (
                    <MenuItem
                      onClick={() => {
                        if (!deleteArmed) {
                          setDeleteArmed(true);
                          return;
                        }
                        closeMenu();
                        onCancel(task);
                      }}
                      sx={{ color: "error.main" }}
                    >
                      <DeleteOutlineIcon fontSize="small" sx={{ me: 1 }} />
                      {deleteArmed ? he.taskDeleteConfirm : he.taskDelete}
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
            {!showMenu && (
              <IconButton
                size="small"
                aria-label={he.taskInfo}
                onClick={() => setInfoOpen(true)}
                sx={{ mt: -0.5 }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          <Typography variant="body2" fontWeight={600} dir="ltr" sx={{ textAlign: "start" }}>
            {he.dueAt}: {formatDueAt(task.due_at)}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
            <Chip
              size="small"
              color={URGENCY_COLOR[urgency]}
              label={he.taskUrgencyLabels[urgency]}
              variant={urgency === "normal" ? "outlined" : "filled"}
            />
            <TaskStatusChip status={task.status} />
            {isManagerNextTask(task) && (
              <Chip
                size="small"
                color="primary"
                label={isEmployeeMode ? he.employeeManagerNextTask : he.managerNextTask}
              />
            )}
            {urgent && <Chip size="small" color="error" label={he.employeeUrgentTasks} />}
            {carryOver && (
              <Chip
                size="small"
                color="warning"
                label={
                  task.created_at
                    ? he.employeeTaskCreatedOn(formatHebrewDayShort(dueDateIso(task.created_at)))
                    : he.employeeCarryOverTask
                }
              />
            )}
          </Box>

          {canMarkNext && onSetManagerNext && (
            <FormControlLabel
              sx={{ m: 0, alignSelf: "flex-start" }}
              control={
                <Checkbox
                  size="small"
                  checked={isManagerNextTask(task)}
                  onChange={(e) => onSetManagerNext(task, e.target.checked)}
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  {he.managerNextTask}
                </Typography>
              }
            />
          )}

          {isEmployeeMode ? (
            <>
              <Button
                size="small"
                variant={instructionsOpen ? "contained" : "outlined"}
                startIcon={<ChatIcon />}
                onClick={() => setInstructionsOpen((v) => !v)}
                sx={{ alignSelf: "flex-start" }}
              >
                {he.taskChatSection}
              </Button>
              <Collapse in={instructionsOpen} unmountOnExit>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.25,
                  }}
                >
                  {hasTextInstructions ? (
                    <Box
                      sx={{
                        maxHeight: 140,
                        overflow: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      {audioSrc && (
                        <Box
                          component="audio"
                          src={audioSrc}
                          controls
                          preload="metadata"
                          sx={{ width: "100%" }}
                        />
                      )}
                      {(task.description || task.spoken_text) && (
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {task.description || task.spoken_text}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {he.taskInstructionsEmpty}
                    </Typography>
                  )}
                  <TaskChatPanel
                    key={task.id}
                    occurrenceId={task.id}
                    compact
                    composeEnabled={composeEnabled}
                    onOccurrenceUpdated={(status) => onChatUpdated?.(task, status)}
                  />
                </Box>
              </Collapse>
            </>
          ) : (
            canEdit &&
            onEdit && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ChatIcon />}
                onClick={() => onEdit(task)}
                sx={{ alignSelf: "flex-start" }}
              >
                {he.taskChatSection}
              </Button>
            )
          )}

          {onListen && onStopListen && (
            <Button
              size="small"
              variant="text"
              startIcon={speaking ? <StopIcon /> : <VolumeUpIcon />}
              onClick={() => (speaking ? onStopListen() : onListen(task))}
              sx={{ alignSelf: "flex-start" }}
            >
              {speaking ? he.taskListenStop : he.taskListen}
            </Button>
          )}

          <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
            {canReview && onReview && (
              <Button
                fullWidth
                variant="contained"
                color="info"
                size="small"
                startIcon={<RateReviewIcon />}
                onClick={() => onReview(task)}
              >
                {he.taskReviewAction}
              </Button>
            )}
            {onOpen && (
              <Button fullWidth variant="outlined" size="small" onClick={() => onOpen(task)}>
                {he.openTask}
              </Button>
            )}
            {canStart && onStart && (
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={
                  starting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />
                }
                onClick={() => onStart(task)}
                disabled={starting}
              >
                {he.startTask}
              </Button>
            )}
            {canComplete && onComplete && (
              <Button
                fullWidth
                variant="contained"
                color="success"
                size="small"
                onClick={() => onComplete(task)}
              >
                {he.markDone}
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle>{he.taskInfo}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography variant="body2">
            <Box component="span" color="text.secondary">
              {he.taskInfoCreatedAt}{" "}
            </Box>
            <Box component="span" dir="ltr">
              {formatDueAt(task.created_at)}
            </Box>
          </Typography>
          <Typography variant="body2">
            <Box component="span" color="text.secondary">
              {he.taskInfoCreatedBy}:{" "}
            </Box>
            {task.manager_name || he.taskInfoUnknownAuthor}
          </Typography>
          {task.assignee_name && (
            <Typography variant="body2">
              <Box component="span" color="text.secondary">
                {he.assignee}:{" "}
              </Box>
              {task.assignee_name}
            </Typography>
          )}
          {task.branch_name && (
            <Typography variant="body2">
              <Box component="span" color="text.secondary">
                {he.branch}:{" "}
              </Box>
              {task.branch_name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>{he.close}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={photoLightboxOpen && Boolean(photoBg)}
        onClose={() => setPhotoLightboxOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            backgroundImage: "none",
            m: 1,
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 0.5 }}>
          <IconButton
            aria-label={he.close}
            onClick={() => setPhotoLightboxOpen(false)}
            sx={{ color: "#fff" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 0, pb: 2, display: "flex", justifyContent: "center" }}>
          {photoBg && (
            <Box
              component="img"
              src={photoBg}
              alt={he.taskReferencePhoto}
              sx={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
