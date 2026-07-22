/** Valeur sentinelle : שיוך → גלריית משימות (pas un employé). */
export const ASSIGN_TO_GALLERY = "__gallery__";

export function isAssignToGallery(assigneeId: string | null | undefined): boolean {
  return (assigneeId || "").trim() === ASSIGN_TO_GALLERY;
}
