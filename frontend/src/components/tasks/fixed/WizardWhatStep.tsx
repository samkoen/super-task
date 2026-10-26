import { useState } from "react";
import { TextField } from "@mui/material";
import { he } from "../../../i18n/he";
import { employeeFieldSx } from "../../../styles/employeeUi";
import { applyReferenceTranscript } from "../../../utils/applyReferenceTranscript";
import { startUrlFieldError } from "../../../utils/startUrl";
import type { WizardForm } from "../../../utils/fixedTaskWizard";
import CompletionRequirementsEditor from "../CompletionRequirementsEditor";
import TaskAdvancedFields from "../form/TaskAdvancedFields";
import TaskFormSection from "../form/TaskFormSection";
import TaskReferenceMediaEditor from "../TaskReferenceMediaEditor";

export interface WizardStepProps {
  form: WizardForm;
  patch: (changes: Partial<WizardForm>) => void;
  disabled: boolean;
}

/** Après transcription de l'audio de référence : complète la description et le titre. */
async function applyTranscript({ form, patch }: WizardStepProps, transcript: string) {
  try {
    const applied = await applyReferenceTranscript({
      transcript,
      currentTitle: form.title,
      currentDescription: form.description,
      currentAssigneeId: "",
      employees: [],
      lockAssignee: true,
    });
    patch({ title: applied.title, description: applied.description });
  } catch {
    /* on garde les champs actuels si le titre automatique échoue */
  }
}

function ContentSection(props: WizardStepProps & { onError?: (message: string) => void }) {
  const { form, patch, disabled, onError } = props;
  return (
    <TaskFormSection title={he.taskFormSectionWhat}>
      <TextField
        label={he.taskTitle}
        value={form.title}
        onChange={(e) => patch({ title: e.target.value })}
        helperText={he.taskTitleOptionalHint}
        fullWidth
        sx={employeeFieldSx}
      />
      <TextField
        label={he.description}
        value={form.description}
        onChange={(e) => patch({ description: e.target.value })}
        multiline
        minRows={2}
        fullWidth
        sx={employeeFieldSx}
      />
      <TaskReferenceMediaEditor
        value={form.media}
        onChange={(media) => patch({ media })}
        onDescriptionAppend={(transcript) => void applyTranscript(props, transcript)}
        disabled={disabled}
        onError={onError}
      />
    </TaskFormSection>
  );
}

/** Étape 1 : le contenu de la tâche (titre, explication, preuve demandée, réglages rares). */
export default function WizardWhatStep(
  props: WizardStepProps & { onError?: (message: string) => void },
) {
  const { form, patch, disabled } = props;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const urlProblem = Boolean(startUrlFieldError(form.startUrl));
  return (
    <>
      <ContentSection {...props} />
      <TaskFormSection title={he.taskFormSectionProof}>
        <CompletionRequirementsEditor
          value={form.completionRequirements}
          onChange={(completionRequirements) => patch({ completionRequirements })}
          disabled={disabled}
        />
      </TaskFormSection>
      <TaskAdvancedFields
        taskKind="fixed"
        value={{
          startUrl: form.startUrl,
          opsCategory: form.opsCategory,
          isWorkStart: form.isWorkStart,
          isWorkEnd: form.isWorkEnd,
        }}
        onChange={patch}
        open={advancedOpen || urlProblem}
        onOpenChange={setAdvancedOpen}
        disabled={disabled}
      />
    </>
  );
}
