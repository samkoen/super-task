import { MenuItem, TextField, Typography } from "@mui/material";
import type { User } from "../../../services/api";
import type { Branch } from "../../../services/branchService";
import { he } from "../../../i18n/he";
import { EMPLOYEE_BRAND, employeeFieldSx } from "../../../styles/employeeUi";
import { assigneeOptionLabel, assigneesForBranch } from "../../../utils/assigneeOptions";
import type { WizardContext } from "../../../utils/fixedTaskWizard";
import BranchChecklist from "../BranchChecklist";
import TaskFormSection from "../form/TaskFormSection";
import { scheduleSummary } from "../form/TaskScheduleFields";
import BranchAssigneeRows from "./BranchAssigneeRows";
import type { WizardStepProps } from "./WizardWhatStep";

type WhereProps = WizardStepProps & {
  ctx: WizardContext;
  branches: Branch[];
  employees: User[];
  currentUserId?: string;
};

/** Menahel snif : un seul snif (le sien), il choisit l'oved ou lui-même. */
function SingleBranchAssignee({ form, patch, disabled, ctx, employees, currentUserId }: WhereProps) {
  const options = assigneesForBranch(employees, ctx.defaultBranchId, currentUserId);
  return (
    <TextField
      select
      label={he.assignee}
      value={form.assigneeUserId}
      onChange={(e) => patch({ assigneeUserId: e.target.value })}
      disabled={disabled}
      required
      fullWidth
      sx={employeeFieldSx}
    >
      {options.map((u) => (
        <MenuItem key={u.id} value={u.id}>{assigneeOptionLabel(u, currentUserId)}</MenuItem>
      ))}
    </TextField>
  );
}

/** Menahel réseau : choix des snifim, puis un oved par snif. */
function NetworkPicker({ form, patch, disabled, ctx, branches }: WhereProps) {
  const setChoice = (branchId: string, userId: string) =>
    patch({ branchChoices: { ...form.branchChoices, [branchId]: userId } });
  return (
    <>
      <Typography color="text.secondary">{he.fixedWizardWhereIntro}</Typography>
      <BranchChecklist
        branches={branches}
        selectedIds={ctx.selectedIds}
        onChange={(ids) => patch({ selectedBranchIds: ids, branchesTouched: true })}
        disabled={disabled}
      />
      <BranchAssigneeRows rows={ctx.rows} onChange={setChoice} disabled={disabled} />
    </>
  );
}

/** Étape 3 : où et par qui, avec le récapitulatif juste avant la création. */
export default function WizardWhereStep(props: WhereProps) {
  const { form, ctx } = props;
  const recap = he.fixedWizardRecap(
    ctx.selectedIds.length,
    scheduleSummary({
      dueAt: form.dueAt,
      recurrence: form.recurrence,
      dueTime: form.dueTime,
      weeklyDays: form.weeklyDays,
      monthlyDay: form.monthlyDay,
    }),
  );
  return (
    <TaskFormSection title={he.fixedWizardWhereTitle}>
      {ctx.canPickBranch ? <NetworkPicker {...props} /> : <SingleBranchAssignee {...props} />}
      <Typography fontWeight={800} sx={{ color: EMPLOYEE_BRAND }} data-testid="wizard-recap">
        {recap}
      </Typography>
    </TaskFormSection>
  );
}
