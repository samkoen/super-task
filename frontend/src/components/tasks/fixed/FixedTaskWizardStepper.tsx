import { Box, Typography } from "@mui/material";
import { he } from "../../../i18n/he";
import { EMPLOYEE_BRAND } from "../../../styles/employeeUi";
import { stepIndex, WIZARD_STEPS, type WizardStep } from "../../../utils/fixedTaskWizard";

/** Indicateur des 3 étapes : fait / en cours / à venir, avec la phrase « שלב X מתוך 3 ». */
export default function FixedTaskWizardStepper({ step }: { step: WizardStep }) {
  const current = stepIndex(step);
  return (
    <Box data-testid="wizard-stepper">
      <Box display="flex" gap={1} mb={0.75}>
        {WIZARD_STEPS.map((key, index) => (
          <Box
            key={key}
            aria-current={index === current ? "step" : undefined}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: index <= current ? EMPLOYEE_BRAND : "action.disabledBackground",
            }}
          />
        ))}
      </Box>
      <Typography fontWeight={800} color={EMPLOYEE_BRAND}>
        {he.fixedWizardProgress(current + 1, WIZARD_STEPS.length)} · {he.fixedWizardStepLabels[step]}
      </Typography>
    </Box>
  );
}
