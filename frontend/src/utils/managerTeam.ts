/**
 * Onglet « צוות » (étape 6) : la liste des oveds du périmètre, lisible d'un coup d'œil.
 * Les comptes (`/users/team`) donnent qui existe ; `team` de `/dashboard/manager` dit où chacun en est.
 */
import type { User } from "../services/api";
import type { TeamMember } from "../services/dashboardService";
import { he } from "../i18n/he";
import { teamNowState, type TeamNowState } from "./managerHome";
import { memberTasks } from "./staffProgress";
import { userBelongsToBranch, userBranchLabels } from "./userBranchMembership";

/** `unknown` : pas d'état du jour (vue réseau sans suivi) ; `noAccess` : compte désactivé. */
export type TeamRosterState = TeamNowState | "unknown" | "noAccess";

export const TEAM_ROSTER_ORDER: TeamRosterState[] = ["idle", "working", "notArrived", "done", "unknown", "noAccess"];

export interface TeamRosterEntry {
  id: string;
  name: string;
  initial: string;
  state: TeamRosterState;
  /** Tâche en cours quand l'oved travaille. */
  detail: string | null;
  late: number;
  done: number;
  total: number;
  branchId: string;
  branchLabel: string;
  photoUrl: string | null;
  user: User | null;
  member: TeamMember | null;
}

/** Tâches en retard de l'oved (journée et arriéré). */
export function memberLateCount(member: TeamMember | null | undefined): number {
  if (!member) return 0;
  return memberTasks(member).filter((t) => t.status === "overdue" || t.segment === "overdue").length;
}

function rosterState(user: User | null, member: TeamMember | null): TeamRosterState {
  if (user && !user.is_active) return "noAccess";
  return member ? teamNowState(member) : "unknown";
}

function branchLabelOf(user: User | null, member: TeamMember | null): string {
  const labels = user ? userBranchLabels(user) : [];
  return labels.length ? labels.join(", ") : user?.branch_name || member?.branch_name || "";
}

/** Une entrée de la liste : compte et/ou état du jour (l'un des deux peut manquer). */
export function rosterEntry(user: User | null, member: TeamMember | null, fallbackBranchId = ""): TeamRosterEntry {
  const name = user?.full_name || member?.full_name || "";
  const state = rosterState(user, member);
  return {
    id: user?.id ?? member?.user_id ?? "",
    name,
    initial: name.trim().charAt(0),
    state,
    detail: state === "working" ? member?.current_task_title ?? null : null,
    late: memberLateCount(member),
    done: member?.completed_today ?? 0,
    total: member?.total_today ?? 0,
    branchId: user?.branch_id || fallbackBranchId,
    branchLabel: branchLabelOf(user, member),
    photoUrl: user?.avatar_url ?? null,
    user,
    member,
  };
}

function byUrgency(a: TeamRosterEntry, b: TeamRosterEntry): number {
  return TEAM_ROSTER_ORDER.indexOf(a.state) - TEAM_ROSTER_ORDER.indexOf(b.state)
    || b.late - a.late
    || a.name.localeCompare(b.name, "he");
}

/**
 * Oveds du périmètre (snif choisi, ou tous), avec leur état du jour quand le tableau de bord le donne.
 * Un oved présent dans le tableau de bord sans compte listé est gardé (l'état prime).
 */
export function buildTeamRoster(users: User[], team: TeamMember[] | null | undefined, scopeBranchId = ""): TeamRosterEntry[] {
  const members = new Map((team ?? []).map((m) => [m.user_id, m]));
  const inScope = scopeBranchId ? users.filter((u) => userBelongsToBranch(u, scopeBranchId)) : users;
  const entries = inScope.map((u) => rosterEntry(u, members.get(u.id) ?? null, scopeBranchId));
  const known = new Set(entries.map((e) => e.id));
  for (const member of members.values()) {
    if (!known.has(member.user_id)) entries.push(rosterEntry(null, member, scopeBranchId));
  }
  return entries.sort(byUrgency);
}

export interface TeamSection {
  state: TeamRosterState;
  entries: TeamRosterEntry[];
}

/** Sections dans l'ordre d'urgence ; les sections vides ne sont pas affichées. */
export function teamSections(entries: TeamRosterEntry[]): TeamSection[] {
  return TEAM_ROSTER_ORDER
    .map((state) => ({ state, entries: entries.filter((e) => e.state === state) }))
    .filter((s) => s.entries.length > 0);
}

/** « בטיפול: ספירת מלאי » ; l'état seul sinon ; le snif en vue réseau. */
export function teamRowLine(entry: TeamRosterEntry, showBranch: boolean): string {
  const states = he.managerHomeTeamStates as Record<string, string>;
  const state = entry.state === "noAccess" ? he.managerTeamNoAccess : states[entry.state] ?? "";
  const what = entry.detail ? `${state}: ${entry.detail}` : state;
  return [what, showBranch ? entry.branchLabel : ""].filter(Boolean).join(" · ");
}

export interface TeamSummary {
  total: number;
  late: number;
  /** Faux quand aucun oved n'a d'état du jour : la page invite à choisir un snif. */
  live: boolean;
}

export function teamSummary(entries: TeamRosterEntry[]): TeamSummary {
  return {
    total: entries.length,
    late: entries.reduce((sum, e) => sum + e.late, 0),
    live: entries.some((e) => e.member !== null),
  };
}
