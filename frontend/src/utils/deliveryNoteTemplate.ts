import { DELIVERY_TASK_LINE_CHECK } from "./deliveryNote";

export interface DeliveryNoteTemplateState {
  opened: boolean;
  taskType: string | null;
}

/** État « teuda » d'une tâche fixe telle qu'elle est enregistrée. */
export function savedDeliveryNoteState(template: {
  opened_by_delivery_note?: boolean | null;
  delivery_note_task_type?: string | null;
}): DeliveryNoteTemplateState {
  const opened = Boolean(template.opened_by_delivery_note);
  return { opened, taskType: opened ? template.delivery_note_task_type || DELIVERY_TASK_LINE_CHECK : null };
}

/** État « teuda » demandé dans le formulaire d'édition. */
export function formDeliveryNoteState(form: {
  opened_by_delivery_note?: boolean;
  delivery_note_task_type?: string;
}): DeliveryNoteTemplateState {
  const opened = Boolean(form.opened_by_delivery_note);
  return { opened, taskType: opened ? form.delivery_note_task_type || DELIVERY_TASK_LINE_CHECK : null };
}

/** Faut-il appeler l'API « teuda » après l'enregistrement ? Seulement si l'état a changé. */
export function deliveryNoteNeedsUpdate(
  saved: DeliveryNoteTemplateState,
  wanted: DeliveryNoteTemplateState,
): boolean {
  return saved.opened !== wanted.opened || saved.taskType !== wanted.taskType;
}
