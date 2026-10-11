/** Ichour en attente et tâche déjà fermée : même fenêtre de réouverture. */
export function dashboardTaskUsesReview(status: string): boolean {
  return status === "completed" || status === "pending_review";
}
