import type {
  BranchSummary,
  HealthLevel,
  ManagerDashboard,
  ManagerMyWork,
  StoreCategoryKpi,
  TaskQueues,
  TeamMember,
  TimelineTask,
} from "../services/dashboardService";
import type { DirectChatCard } from "../services/directChatService";
import { buildPendingReviewQueue, buildQuestionsQueue } from "./dashboardCarousels";
import { buildManagerSummary } from "./managerSummary";
import { computeArrivedAt, memberTasks } from "./staffProgress";
import { TODAY_PERIODS, periodForDue, type TodayPeriod } from "./todayPeriods";

/**
 * Accueil menahel (maquette Figma « Menahel · בית (snif) ») : tout ce qui est calculé ici est pur,
 * à partir des données déjà renvoyées par `/dashboard/manager`.
 */

export type DayPeriod = TodayPeriod;
export const DAY_PERIODS: DayPeriod[] = TODAY_PERIODS;

/** Moment de la journée d'une échéance : mêmes seuils que l'écran oved (12 h, 17 h). */
export function periodOf(dueAt: string): DayPeriod {
  return periodForDue(dueAt);
}

function uniqueQueueTasks(queues: TaskQueues | null | undefined): TimelineTask[] {
  if (!queues) return [];
  const byId = new Map<string, TimelineTask>();
  for (const list of [queues.completed, queues.pending_review, queues.in_progress, queues.upcoming]) {
    for (const task of list ?? []) byId.set(task.id, task);
  }
  return [...byId.values()];
}

/** Rendue par l'oved (envoyée ou approuvée) : compte comme faite dans la barre du jour. */
function isReported(task: TimelineTask): boolean {
  return ["completed", "pending_review"].includes(task.status) || ["completed", "pending_review"].includes(task.segment);
}

export interface PeriodProgress {
  period: DayPeriod;
  total: number;
  done: number;
}

export function buildPeriodProgress(queues: TaskQueues | null | undefined): PeriodProgress[] {
  const rows = DAY_PERIODS.map((period) => ({ period, total: 0, done: 0 }));
  for (const task of uniqueQueueTasks(queues)) {
    const row = rows.find((r) => r.period === periodOf(task.due_at));
    if (!row) continue;
    row.total += 1;
    if (isReported(task)) row.done += 1;
  }
  return rows;
}

function kpiPct(kpi: StoreCategoryKpi | undefined): number | null {
  if (!kpi || kpi.total <= 0) return null;
  return Math.round(kpi.approval_pct);
}

export interface ManagerPulse {
  /** Nombre de tâches du jour : à 0, la carte dit « אין משימות היום » au lieu d'un faux 100 %. */
  total: number;
  completionPct: number;
  overdue: number;
  health: HealthLevel;
  periods: PeriodProgress[];
  /** % approuvé ; `null` quand il n'y a aucune tâche de cette catégorie aujourd'hui. */
  cleaningPct: number | null;
  frontsPct: number | null;
}

export function buildManagerPulse(data: ManagerDashboard): ManagerPulse {
  const summary = buildManagerSummary(data, 0);
  return {
    total: summary.total,
    completionPct: summary.completionPct,
    overdue: summary.overdue,
    health: data.health,
    periods: buildPeriodProgress(data.task_queues),
    cleaningPct: kpiPct(data.store_kpis?.cleaning),
    frontsPct: kpiPct(data.store_kpis?.fronts_signage),
  };
}

/**
 * Titre de l'accueil : le nom du snif regardé, sinon « כל הרשת » dès qu'aucun snif n'est choisi
 * (vue réseau ou tableau « tous les oveds »).
 */
export function homeTitle(data: Pick<ManagerDashboard, "branch"> | null, fallbackBranch: string | null | undefined, networkTitle: string): string {
  if (data && !data.branch) return networkTitle;
  return data?.branch?.name || fallbackBranch || "";
}

/** Messages directs du snif regardé seulement ; tous quand on regarde toute la reshet. */
export function chatsForScope(chats: DirectChatCard[], branchId: string | null | undefined): DirectChatCard[] {
  if (!branchId) return chats;
  return chats.filter((chat) => !chat.branch_id || chat.branch_id === branchId);
}

export type InboxKind = "question" | "review" | "chat";

export interface InboxItem {
  key: string;
  kind: InboxKind;
  title: string;
  who: string;
  preview: string;
  taskId?: string;
  chat?: DirectChatCard;
}

/** File « לטיפולך » : questions d'abord, puis preuves à valider, puis messages directs non lus. */
export function buildManagerInbox(
  queues: TaskQueues | null | undefined,
  chats: DirectChatCard[],
  nowMs = Date.now(),
): InboxItem[] {
  const fromTask = (kind: InboxKind) => ({ task }: { task: TimelineTask }): InboxItem => ({
    key: `${kind}-${task.id}`,
    kind,
    title: task.title,
    who: task.assignee_name ?? "",
    preview: "",
    taskId: task.id,
  });
  const questions = buildQuestionsQueue(queues, nowMs).map(fromTask("question"));
  const reviews = buildPendingReviewQueue(queues).map(fromTask("review"));
  const direct = chats.map((chat): InboxItem => ({
    key: `chat-${chat.counterpart_user_id}`,
    kind: "chat",
    title: chat.counterpart_name,
    who: chat.branch_name ?? "",
    preview: chat.last_preview ?? "",
    chat,
  }));
  return [...questions, ...reviews, ...direct];
}

export type TeamNowState = "idle" | "working" | "notArrived" | "done";

export interface TeamNowEntry {
  id: string;
  name: string;
  initial: string;
  state: TeamNowState;
  /** Tâche en cours quand l'oved travaille. */
  detail: string | null;
  member: TeamMember;
}

const STATE_ORDER: TeamNowState[] = ["idle", "working", "notArrived", "done"];

export function teamNowState(member: TeamMember): TeamNowState {
  if (member.total_today > 0 && member.completed_today >= member.total_today) return "done";
  if (member.status === "in_progress") return "working";
  if (!computeArrivedAt(memberTasks(member))) return "notArrived";
  return "idle";
}

/**
 * Bande « הצוות עכשיו » : ceux qui n'ont rien en cours passent en tête, puis ceux qui travaillent.
 * Tous les oveds du snif y sont : `is_active` du backend veut dire « a travaillé aujourd'hui ».
 */
export function buildTeamNow(team: TeamMember[] | null | undefined): TeamNowEntry[] {
  return (team ?? [])
    .map((member) => {
      const state = teamNowState(member);
      return {
        id: member.user_id,
        name: member.full_name,
        initial: member.full_name.trim().charAt(0),
        state,
        detail: state === "working" ? member.current_task_title : null,
        member,
      };
    })
    .sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || a.name.localeCompare(b.name, "he"));
}

export interface OwnTasksSummary {
  open: number;
  nextAt: string | null;
  late: boolean;
}

/** Ligne compacte « יש לך 3 משימות » du menahel snif ; `null` quand il n'a rien à faire. */
export function ownTasksSummary(work: ManagerMyWork | null | undefined, nowMs = Date.now()): OwnTasksSummary | null {
  if (!work) return null;
  const byId = new Map<string, { due_at: string; status: string }>();
  for (const list of [work.urgent_tasks, work.in_progress_tasks, work.awaiting_response_tasks, work.today_tasks]) {
    for (const task of list ?? []) byId.set(task.id, task);
  }
  const open = [...byId.values()];
  if (!open.length) return null;
  const sorted = [...open].sort((a, b) => a.due_at.localeCompare(b.due_at));
  const late = (work.urgent_tasks?.length ?? 0) > 0
    || open.some((t) => t.status === "overdue" || new Date(t.due_at).getTime() < nowMs);
  return { open: open.length, nextAt: sorted[0]?.due_at ?? null, late };
}

const HEALTH_ORDER: HealthLevel[] = ["red", "orange", "green"];

function byUrgency(a: BranchSummary, b: BranchSummary): number {
  return HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health)
    || b.overdue - a.overdue
    || a.completion_rate - b.completion_rate;
}

export interface NetworkOverview {
  healthy: number;
  attention: BranchSummary[];
  all: BranchSummary[];
}

/** Accueil reshet : seuls les snifim orange ou rouges remontent ; les autres restent repliés. */
export function buildNetworkOverview(branches: BranchSummary[] | null | undefined): NetworkOverview {
  const all = [...(branches ?? [])].sort(byUrgency);
  const attention = all.filter((b) => b.health !== "green");
  return { healthy: all.length - attention.length, attention, all };
}
