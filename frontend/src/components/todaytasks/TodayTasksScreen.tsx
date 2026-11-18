import { useState, type ReactNode } from "react";
import { Avatar, Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import NotificationBell from "../notifications/NotificationBell";
import FlowBottomNav from "../taskflow/FlowBottomNav";
import bellIcon from "../../assets/flow1/icon-bell.svg";
import bgGlow from "../../assets/flow2/bg-glow.svg";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { he } from "../../i18n/he";
import { flowColor, flowSize, flowSpace, flowText } from "../../styles/flowTokens";
import { greetingFor } from "../../utils/flowStack";
import { withSystemBottomInsetCss, withSystemTopInsetCss } from "../../utils/systemInsets";
import { timelineTimeLabel } from "../../utils/employeeTimeline";
import { groupTodayTasks, isTodayTaskDone, type TodayPeriod } from "../../utils/todayPeriods";
import TodayPeriodSection from "./TodayPeriodSection";
import TodayTaskItem from "./TodayTaskItem";

export type TodayTask = {
  id: string;
  title: string;
  due_at: string;
  status: string;
  /** Durée prévue en minutes (« 15 דק׳ ») quand le serveur la fournit. */
  duration_minutes?: number | null;
};

type Props<T extends TodayTask> = {
  tasks: T[];
  /**
   * Premier chargement : fond seul et indicateur, sans en-tête ni barre du bas. On ne sait pas encore
   * si l'oved verra cet écran ou la porte פתיחת משמרת : rien ne doit apparaître puis disparaître.
   */
  loading?: boolean;
  employeeName?: string | null;
  photoUrl?: string | null;
  onOpenTask: (task: T) => void;
  onOpenTaskChat: (task: T) => void;
  onOpenChats: () => void;
  onOpenAccount: () => void;
  /**
   * Onglet « בית » de la barre du bas. Par défaut il remonte en haut de la liste ; un menahel snif
   * (« המשימות שלי ») y retrouve son espace, l'écran n'ayant pas d'autre sortie.
   */
  onHome?: () => void;
  /** Contenu ajouté sous les groupes (ex. « סיום משמרת »). */
  footer?: ReactNode;
  /** Tâches finies sur ce téléphone dont les vidéos attendent la קליטה : cochées, avec « יישלח כשתחזור הקליטה ». */
  awaitingUploadIds?: ReadonlySet<string>;
};

/** Mesures Figma : la barre du bas est à 31 px du bas, 120 px libres sous le dernier groupe. */
const NAV_BOTTOM = 31;
const CONTENT_BOTTOM = 120;

/** Round Button 56 (cloche neutral/600) avec le point orange quand il y a du nouveau. */
function BellButton() {
  return (
    <NotificationBell
      renderTrigger={(open, unread) => (
        <ButtonBase
          aria-label={he.notificationsTitle}
          data-testid="today-bell"
          onClick={open}
          sx={{ position: "relative", flexShrink: 0, width: flowSize.roundButton, height: flowSize.roundButton, borderRadius: "50%", bgcolor: flowColor.neutral0 }}
        >
          <Box component="img" src={bellIcon} alt="" sx={{ width: 22, height: 22, display: "block" }} />
          {unread > 0 ? (
            <Box
              data-testid="today-bell-dot"
              sx={{ position: "absolute", left: 32.5, top: 17, width: 7, height: 7, borderRadius: "50%", bgcolor: flowColor.orange500 }}
            />
          ) : null}
        </ButtonBase>
      )}
    />
  );
}

/** « greeting » : avatar 40 à droite puis « שלום אבי, בוקר טוב. » (Body/Large, alpha 53 %). */
function Greeting({ name, photoUrl, onOpenAccount }: { name?: string | null; photoUrl?: string | null; onOpenAccount: () => void }) {
  const media = useResolvedMediaSrc(photoUrl || null, false);
  const initial = (name || "").trim().charAt(0);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: `${flowSpace.s12}px`, width: "100%", height: 40 }}>
      <ButtonBase aria-label={he.todayOpenAccount} data-testid="today-avatar" onClick={onOpenAccount} sx={{ flexShrink: 0, borderRadius: "50%" }}>
        <Avatar
          src={media.src ?? undefined}
          alt={name || ""}
          sx={{ width: 40, height: 40, bgcolor: flowColor.neutral300, color: flowColor.neutral900, fontFamily: flowText.body.fontFamily }}
        >
          {initial}
        </Avatar>
      </ButtonBase>
      <Typography data-testid="today-greeting" sx={{ ...flowText.bodyLarge, color: flowColor.alphaNeutral1000_53, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {greetingFor(name)}
      </Typography>
    </Box>
  );
}

function Header(props: { name?: string | null; photoUrl?: string | null; onOpenAccount: () => void }) {
  return (
    <Box component="header" sx={{ display: "flex", flexDirection: "column", gap: `${flowSpace.s16}px`, width: "100%" }}>
      <Greeting {...props} />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 2 }}>
        <Typography component="h1" sx={{ ...flowText.h1, color: flowColor.neutral900, whiteSpace: "nowrap" }}>
          {he.todayTasksTitle}
        </Typography>
        <BellButton />
      </Box>
    </Box>
  );
}

function usePeriodToggles() {
  const [closed, setClosed] = useState<Set<TodayPeriod>>(() => new Set());
  const toggle = (period: TodayPeriod) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  return { isOpen: (period: TodayPeriod) => !closed.has(period), toggle };
}

/** Premier chargement : même fond que l'écran, rien d'autre (ni en-tête, ni barre du bas). */
function LoadingScreen() {
  return (
    <Box
      dir="rtl"
      data-testid="today-tasks-loading"
      role="status"
      aria-label={he.todayTasksLoading}
      sx={{ minHeight: "100vh", bgcolor: flowColor.neutral100, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <CircularProgress size={32} sx={{ color: flowColor.orange500 }} />
    </Box>
  );
}

/**
 * FLOW 2 · écran 01 « המשימות להיום » (Figma 436:1265) : salutation, titre et cloche, puis les tâches
 * du jour par moment de la journée (בוקר / צהריים / ערב), chaque groupe se pliant avec son chevron.
 */
function taskSubtitle(task: TodayTask, awaitingUploadIds?: ReadonlySet<string>): string | null {
  if (awaitingUploadIds?.has(task.id) && !isTodayTaskDone(task.status)) return he.todayAwaitingUpload;
  return task.duration_minutes ? he.todayTaskMinutes(task.duration_minutes) : null;
}

export default function TodayTasksScreen<T extends TodayTask>(props: Props<T>) {
  const { tasks, loading = false, employeeName, photoUrl, onOpenTask, onOpenTaskChat, onOpenChats, onOpenAccount, onHome, footer, awaitingUploadIds } = props;
  const groups = groupTodayTasks(tasks);
  const toggles = usePeriodToggles();
  if (loading) return <LoadingScreen />;
  return (
    <Box
      dir="rtl"
      data-testid="today-tasks-screen"
      sx={{ position: "relative", minHeight: "100vh", overflow: "hidden", bgcolor: flowColor.neutral100 }}
    >
      <Box sx={{ position: "relative", width: "100%", maxWidth: 393, mx: "auto" }}>
        <Box
          component="img"
          src={bgGlow}
          alt=""
          aria-hidden
          sx={{ position: "absolute", top: -190.78, left: 58.22, width: 653.56, height: 653.56, maxWidth: "none", pointerEvents: "none", zIndex: 0 }}
        />
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            px: `${flowSpace.s24}px`,
            pt: withSystemTopInsetCss("8px"),
            pb: withSystemBottomInsetCss(`${CONTENT_BOTTOM}px`),
          }}
        >
          <Header name={employeeName} photoUrl={photoUrl} onOpenAccount={onOpenAccount} />
          <Box data-testid="today-periods" sx={{ display: "flex", flexDirection: "column", gap: `${flowSpace.s16}px`, width: "100%" }}>
            {groups.length === 0 ? (
              <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral1000_53, textAlign: "center", py: 4 }}>
                {he.todayTasksEmpty}
              </Typography>
            ) : null}
            {groups.map((group) => (
              <TodayPeriodSection
                key={group.period}
                period={group.period}
                open={toggles.isOpen(group.period)}
                onToggle={() => toggles.toggle(group.period)}
              >
                {group.tasks.map((task) => (
                  <TodayTaskItem
                    key={task.id}
                    title={task.title}
                    time={timelineTimeLabel(task.due_at)}
                    subtitle={taskSubtitle(task, awaitingUploadIds)}
                    done={isTodayTaskDone(task.status) || Boolean(awaitingUploadIds?.has(task.id))}
                    dataState={awaitingUploadIds?.has(task.id) ? "awaiting-upload" : undefined}
                    onOpen={() => onOpenTask(task)}
                    onOpenChat={() => onOpenTaskChat(task)}
                  />
                ))}
              </TodayPeriodSection>
            ))}
            {footer}
          </Box>
        </Box>
      </Box>
      <FlowBottomNav
        bottomOffset={NAV_BOTTOM}
        onHome={onHome ?? (() => window.scrollTo({ top: 0, behavior: "smooth" }))}
        onChat={onOpenChats}
      />
    </Box>
  );
}
