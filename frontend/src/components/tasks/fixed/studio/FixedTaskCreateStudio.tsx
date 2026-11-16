import { useMemo, useState } from "react";
import { ButtonBase, TextField, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import type { User } from "../../../../services/api";
import type { Branch } from "../../../../services/branchService";
import { useFixedTaskWizardForm } from "../../../../hooks/useFixedTaskWizardForm";
import { he } from "../../../../i18n/he";
import { flowColor, flowText } from "../../../../styles/flowTokens";
import { applyReferenceTranscript } from "../../../../utils/applyReferenceTranscript";
import { assigneesForBranch } from "../../../../utils/assigneeOptions";
import {
  firstBlockedStep,
  stepBlocker,
  wizardContext,
  type WizardContext,
  type WizardForm,
} from "../../../../utils/fixedTaskWizard";
import { displayHour } from "../../../../utils/studioRequirements";
import { isOnce, onceBlocker, onceDefaults, onceScheduleLine, studioPayload } from "../../../../utils/studioOnce";
import BranchChecklist from "../../BranchChecklist";
import type { NewTaskFormSubmitPayload } from "../../NewTaskFormDialog";
import BranchAssigneeRows from "../BranchAssigneeRows";
import StudioAssigneePicker from "./StudioAssignee";
import StudioCardStack from "./StudioCardStack";
import StudioHeader from "./StudioHeader";
import StudioMoreSheet from "./StudioMoreSheet";
import StudioPreview from "./StudioPreview";
import StudioSchedule from "./StudioSchedule";
import { StudioGroupTitle, StudioLeaveDialog, StudioSaveBar, StudioScreen, StudioSection } from "./StudioScreen";
import { studioFieldSx, studioSectionSx } from "./studioUi";

export type FixedTaskCreateStudioProps = {
  branches: Branch[];
  employees: User[];
  /** Menahel réseau / admin : choisit les snifim ; sinon la tâche va dans `defaultBranchId`. */
  canPickBranch: boolean;
  defaultBranchId: string;
  currentUserId?: string;
  saving: boolean;
  onSubmit: (payload: NewTaskFormSubmitPayload) => Promise<void>;
  /** Quitter sans créer (le brouillon est abandonné). */
  onCancel: () => void;
  onError?: (message: string) => void;
  /** Garde le brouillon si l'écran est démonté (navigation). */
  rememberKey?: string;
  /** Studio unique : la pastille « פעם אחת » crée une tâche ponctuelle. */
  allowOnce?: boolean;
  /** Pré-remplissage d'un formulaire neuf (« פעם אחת », bibliothèque, signalement). */
  initialForm?: Partial<WizardForm>;
};

type Patch = (changes: Partial<WizardForm>) => void;

export function scheduleLine(dueTime: string, recurrence: string): string {
  const hour = displayHour(dueTime);
  const label = he.recurrenceLabels[recurrence as keyof typeof he.recurrenceLabels] ?? "";
  return [hour ? he.flowDueAtHour(hour) : "", label].filter(Boolean).join(" · ");
}

/** Le premier blocage, toutes étapes confondues (contenu, date de « פעם אחת », puis snif / oved). */
function blockerOf(form: WizardForm, ctx: WizardContext): string {
  const step = firstBlockedStep(form, ctx);
  if (step === "what") return stepBlocker(step, form, ctx);
  return onceBlocker(form) || (step ? stepBlocker(step, form, ctx) : "");
}

function headerLine(form: WizardForm): string {
  return isOnce(form) ? onceScheduleLine(form.dueAt) : scheduleLine(form.dueTime, form.recurrence);
}

function WhenSection({ form, patch, allowOnce, disabled }: { form: WizardForm; patch: Patch; allowOnce?: boolean; disabled: boolean }) {
  const once = allowOnce
    ? {
        active: isOnce(form),
        dueAt: form.dueAt,
        onChange: ({ active, dueAt }: { active?: boolean; dueAt?: string }) => {
          if (active === true) patch({ taskKind: "ad_hoc", dueAt: form.dueAt || (onceDefaults().dueAt as string) });
          if (active === false) patch({ taskKind: "fixed" });
          if (dueAt !== undefined) patch({ dueAt });
        },
      }
    : undefined;
  return (
    <StudioSection title={he.studioWhenTitle} testId="studio-when">
      <StudioSchedule
        value={{ recurrence: form.recurrence, dueTime: form.dueTime, weeklyDays: form.weeklyDays, monthlyDay: form.monthlyDay }}
        onChange={(changes) => patch(changes)}
        once={once}
        disabled={disabled}
      />
    </StudioSection>
  );
}

/**
 * Pile de cartes « שלבי צילום ». Version courte pour « פעם אחת » : repliée derrière un bouton
 * tant qu'aucune étape n'est ajoutée.
 */
function StepsSection({ form, patch, disabled }: { form: WizardForm; patch: Patch; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  if (isOnce(form) && !open && form.completionRequirements.length === 0) {
    return (
      <ButtonBase data-testid="studio-add-steps" disabled={disabled} onClick={() => setOpen(true)} sx={{ ...studioSectionSx, alignItems: "flex-start", textAlign: "right" }}>
        <Typography component="span" sx={{ ...flowText.h2, color: flowColor.neutral900, display: "flex", alignItems: "center", gap: "6px" }}>
          <AddRoundedIcon /> {he.studioAddSteps}
        </Typography>
        <Typography component="span" sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{he.studioAddStepsHint}</Typography>
      </ButtonBase>
    );
  }
  return (
    <>
      <StudioGroupTitle title={he.studioStepsTitle} hint={he.studioStepsHint} />
      <StudioCardStack value={form.completionRequirements} onChange={(completionRequirements) => patch({ completionRequirements })} disabled={disabled} />
    </>
  );
}

function hasContent(form: WizardForm): boolean {
  return Boolean(form.title.trim() || form.description.trim() || form.completionRequirements.length);
}

async function applyTranscript(form: WizardForm, patch: Patch, transcript: string) {
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
    /* le titre automatique est facultatif : on garde les champs actuels */
  }
}

function WhoSection({ props, form, patch, ctx }: { props: FixedTaskCreateStudioProps; form: WizardForm; patch: Patch; ctx: WizardContext }) {
  if (ctx.canPickBranch) {
    return (
      <StudioSection title={he.studioWhoTitle} hint={he.fixedWizardWhereIntro} testId="studio-who">
        <BranchChecklist
          branches={props.branches}
          selectedIds={ctx.selectedIds}
          onChange={(ids) => patch({ selectedBranchIds: ids, branchesTouched: true })}
          disabled={props.saving}
        />
        <BranchAssigneeRows
          rows={ctx.rows}
          onChange={(branchId, userId) => patch({ branchChoices: { ...form.branchChoices, [branchId]: userId } })}
          disabled={props.saving}
        />
      </StudioSection>
    );
  }
  return (
    <StudioSection title={he.studioWhoTitle} testId="studio-who">
      <StudioAssigneePicker
        employees={assigneesForBranch(props.employees, ctx.defaultBranchId, props.currentUserId)}
        value={form.assigneeUserId}
        onChange={(assigneeUserId) => patch({ assigneeUserId })}
        currentUserId={props.currentUserId}
        disabled={props.saving}
      />
    </StudioSection>
  );
}

function previewPerson(props: FixedTaskCreateStudioProps, form: WizardForm, ctx: WizardContext): User | undefined {
  const id = ctx.canPickBranch ? ctx.rows[0]?.assigneeId : form.assigneeUserId;
  return props.employees.find((u) => u.id === id);
}

/**
 * Création d'une tâche fixe dans le style du FLOW 1 : le menahel compose la tâche directement
 * dans les cartes que l'oved verra, puis règle « מתי » et « מי מבצע » sur la même page.
 */
export default function FixedTaskCreateStudio(props: FixedTaskCreateStudioProps) {
  const { form, patch } = useFixedTaskWizardForm(props.defaultBranchId, props.rememberKey, props.initialForm);
  const [moreOpen, setMoreOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ctx = useMemo(
    () =>
      wizardContext(form, {
        branches: props.branches,
        employees: props.employees,
        canPickBranch: props.canPickBranch,
        defaultBranchId: props.defaultBranchId,
      }),
    [form, props.branches, props.employees, props.canPickBranch, props.defaultBranchId],
  );
  const blocker = blockerOf(form, ctx);
  const person = previewPerson(props, form, ctx);
  const create = () => {
    if (blocker) return;
    void props.onSubmit(studioPayload(form, ctx)).catch(() => undefined);
  };
  const back = () => (hasContent(form) ? setLeaving(true) : props.onCancel());

  const header = (
    <StudioHeader
      kicker={isOnce(form) ? he.studioKickerOnce : he.studioKickerCreate}
      title={form.title}
      onTitleChange={(title) => patch({ title })}
      scheduleLine={headerLine(form)}
      onBack={back}
      onPreview={() => setPreviewOpen(true)}
      onMore={() => setMoreOpen(true)}
      disabled={props.saving}
    />
  );
  const footer = (
    <StudioSaveBar label={he.studioCreate} onSave={create} saving={props.saving} disabled={Boolean(blocker)} note={blocker} noteTestId="studio-blocker" />
  );

  return (
    <StudioScreen header={header} footer={footer} onBack={back}>
      <StepsSection form={form} patch={patch} disabled={props.saving} />
      <StudioSection title={he.studioDetailsTitle}>
        <TextField
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder={he.studioDescriptionPlaceholder}
          inputProps={{ "aria-label": he.description }}
          multiline
          minRows={3}
          fullWidth
          disabled={props.saving}
          sx={studioFieldSx}
        />
      </StudioSection>
      <WhenSection form={form} patch={patch} allowOnce={props.allowOnce} disabled={props.saving} />
      <WhoSection props={props} form={form} patch={patch} ctx={ctx} />
      {ctx.canPickBranch ? (
        <Typography data-testid="wizard-recap" sx={{ ...flowText.button, color: flowColor.navy800, px: "4px" }}>
          {he.fixedWizardRecap(ctx.selectedIds.length, headerLine(form))}
        </Typography>
      ) : null}
      <StudioMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        disabled={props.saving}
        media={form.media}
        onMediaChange={(media) => patch({ media })}
        onTranscript={(t) => void applyTranscript(form, patch, t)}
        onError={props.onError}
        advanced={{ startUrl: form.startUrl, opsCategory: form.opsCategory, isWorkStart: form.isWorkStart, isWorkEnd: form.isWorkEnd }}
        onAdvancedChange={patch}
        delivery={{ enabled: Boolean(form.openedByDeliveryNote), taskType: form.deliveryNoteTaskType ?? "" }}
        onDeliveryChange={(p) =>
          patch({
            ...(p.enabled !== undefined ? { openedByDeliveryNote: p.enabled } : {}),
            ...(p.taskType !== undefined ? { deliveryNoteTaskType: p.taskType } : {}),
          })
        }
      />
      <StudioPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={form.title}
        dueTime={form.dueTime}
        requirements={form.completionRequirements}
        employeeName={person?.full_name}
        photoUrl={person?.avatar_url}
      />
      <StudioLeaveDialog open={leaving} onStay={() => setLeaving(false)} onLeave={props.onCancel} />
    </StudioScreen>
  );
}
