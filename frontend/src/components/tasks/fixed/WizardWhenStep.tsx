import { he } from "../../../i18n/he";
import DeliveryNoteTemplateFields from "../form/DeliveryNoteTemplateFields";
import TaskFormSection from "../form/TaskFormSection";
import TaskScheduleFields, { type TaskScheduleValue } from "../form/TaskScheduleFields";
import type { WizardStepProps } from "./WizardWhatStep";

/** Étape 2 : récurrence, heure, jours — et ouverture par bon de livraison. */
export default function WizardWhenStep({ form, patch, disabled }: WizardStepProps) {
  const value: TaskScheduleValue = {
    dueAt: form.dueAt,
    recurrence: form.recurrence,
    dueTime: form.dueTime,
    weeklyDays: form.weeklyDays,
    monthlyDay: form.monthlyDay,
  };
  return (
    <>
      <TaskFormSection title={he.taskFormSectionWhen}>
        <TaskScheduleFields
          taskKind="fixed"
          toGallery={false}
          value={value}
          onChange={(changes) => patch(changes)}
          disabled={disabled}
        />
      </TaskFormSection>
      <TaskFormSection title={he.deliveryNoteSectionTitle}>
        <DeliveryNoteTemplateFields
          enabled={Boolean(form.openedByDeliveryNote)}
          onEnabledChange={(openedByDeliveryNote) => patch({ openedByDeliveryNote })}
          taskType={form.deliveryNoteTaskType ?? ""}
          onTaskTypeChange={(deliveryNoteTaskType) => patch({ deliveryNoteTaskType })}
          disabled={disabled}
        />
      </TaskFormSection>
    </>
  );
}
