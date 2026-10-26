import { useMemo } from "react";
import { Button, CircularProgress, Typography } from "@mui/material";
import type { User } from "../../../services/api";
import type { Branch } from "../../../services/branchService";
import { useFixedTaskWizardForm } from "../../../hooks/useFixedTaskWizardForm";
import { he } from "../../../i18n/he";
import { dialogSecondaryActionSx } from "../../../styles/dialogUi";
import { employeePrimaryButtonSx } from "../../../styles/employeeUi";
import { asList } from "../../../utils/asList";
import {
  firstBlockedStep,
  isFirstStep,
  isLastStep,
  nextStep,
  previousStep,
  stepBlocker,
  wizardContext,
  wizardPayload,
  type WizardContext,
  type WizardForm,
} from "../../../utils/fixedTaskWizard";
import FormDialog from "../../ui/FormDialog";
import type { NewTaskFormSubmitPayload } from "../NewTaskFormDialog";
import FixedTaskWizardStepper from "./FixedTaskWizardStepper";
import WizardWhatStep, { type WizardStepProps } from "./WizardWhatStep";
import WizardWhenStep from "./WizardWhenStep";
import WizardWhereStep from "./WizardWhereStep";

export interface FixedTaskWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: NewTaskFormSubmitPayload) => Promise<void>;
  branches: Branch[];
  employees: User[];
  /** Menahel réseau / admin : choisit les snifim ; sinon la tâche va dans `defaultBranchId`. */
  canPickBranch: boolean;
  defaultBranchId: string;
  currentUserId?: string;
  saving?: boolean;
  onError?: (message: string) => void;
  /** Garde le brouillon si on quitte l'écran. */
  rememberKey?: string;
}

function WizardActions({
  step,
  blocker,
  saving,
  onBack,
  onNext,
  onCreate,
}: {
  step: WizardForm["step"];
  blocker: string;
  saving: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
}) {
  const last = isLastStep(step);
  return (
    <>
      <Button onClick={onBack} disabled={saving} sx={dialogSecondaryActionSx}>
        {isFirstStep(step) ? he.cancel : he.fixedWizardBack}
      </Button>
      <Button
        variant="contained"
        onClick={last ? onCreate : onNext}
        disabled={Boolean(blocker) || saving}
        sx={employeePrimaryButtonSx}
      >
        {saving ? <CircularProgress size={24} color="inherit" /> : last ? he.newTaskCreate : he.fixedWizardNext}
      </Button>
      {blocker ? (
        <Typography color="text.secondary" sx={{ textAlign: "center" }} data-testid="wizard-blocker">
          {blocker}
        </Typography>
      ) : null}
    </>
  );
}

function WizardBody({
  stepProps,
  ctx,
  branches,
  employees,
  currentUserId,
  onError,
}: {
  stepProps: WizardStepProps;
  ctx: WizardContext;
  branches: Branch[];
  employees: User[];
  currentUserId?: string;
  onError?: (message: string) => void;
}) {
  const step = stepProps.form.step;
  return (
    <>
      <FixedTaskWizardStepper step={step} />
      {step === "what" && <WizardWhatStep {...stepProps} onError={onError} />}
      {step === "when" && <WizardWhenStep {...stepProps} />}
      {step === "where" && (
        <WizardWhereStep
          {...stepProps}
          ctx={ctx}
          branches={branches}
          employees={employees}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

/** Assistant de création d'une tâche fixe : Quoi → Quand → Où (un oved par snif). */
export default function FixedTaskWizard(props: FixedTaskWizardProps) {
  const { open, onClose, onSubmit, canPickBranch, defaultBranchId, saving = false } = props;
  const branches = asList<Branch>(props.branches);
  const employees = asList<User>(props.employees);
  const { form, patch } = useFixedTaskWizardForm(defaultBranchId, props.rememberKey);
  const ctx = useMemo(
    () => wizardContext(form, { branches, employees, canPickBranch, defaultBranchId }),
    [form, branches, employees, canPickBranch, defaultBranchId],
  );
  const create = () => {
    const blocked = firstBlockedStep(form, ctx);
    if (blocked) patch({ step: blocked });
    else void onSubmit(wizardPayload(form, ctx));
  };
  const goBack = () => (isFirstStep(form.step) ? onClose() : patch({ step: previousStep(form.step) }));
  const actions = (
    <WizardActions
      step={form.step}
      blocker={stepBlocker(form.step, form, ctx)}
      saving={saving}
      onBack={goBack}
      onNext={() => patch({ step: nextStep(form.step) })}
      onCreate={create}
    />
  );
  return (
    <FormDialog open={open} title={he.newFixedTask} onClose={onClose} busy={saving} actions={actions}>
      <WizardBody
        stepProps={{ form, patch, disabled: saving }}
        ctx={ctx}
        branches={branches}
        employees={employees}
        currentUserId={props.currentUserId}
        onError={props.onError}
      />
    </FormDialog>
  );
}
