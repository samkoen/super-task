import type { ManagerDashboard } from "../services/dashboardService";
import { buildPendingReviewQueue, buildQuestionsQueue } from "./dashboardCarousels";

export interface ManagerSummary {
  /** Tâches terminées qui attendent l'approbation du manager. */
  reviews: number;
  /** Questions de tâches + conversations directes en attente de réponse. */
  messages: number;
  overdue: number;
  completed: number;
  total: number;
  /** 0–100, arrondi. */
  completionPct: number;
}

/** Chiffres clés « ce qui me concerne maintenant » affichés en haut du dashboard manager. */
export function buildManagerSummary(data: ManagerDashboard, directChats: number): ManagerSummary {
  const queues = data.task_queues;
  const counts = data.counts;
  const rate = Number.isFinite(counts.completion_rate) ? counts.completion_rate : 0;
  return {
    reviews: buildPendingReviewQueue(queues).length,
    messages: buildQuestionsQueue(queues).length + Math.max(0, directChats),
    overdue: Math.max(0, counts.overdue_open ?? counts.tasks_overdue ?? 0),
    completed: counts.tasks_completed,
    total: counts.tasks_total,
    completionPct: Math.min(100, Math.max(0, Math.round(rate * 100))),
  };
}

/** Vrai quand rien n'attend le manager (aucun appel à l'action). */
export function isManagerAllClear(summary: ManagerSummary): boolean {
  return summary.reviews === 0 && summary.messages === 0 && summary.overdue === 0;
}
