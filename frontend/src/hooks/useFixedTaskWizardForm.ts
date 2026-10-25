import { useCallback, useEffect, useState } from "react";
import {
  readFixedTaskCreateForm,
  writeFixedTaskCreateForm,
} from "../utils/fixedTaskScreenDraft";
import { newWizardForm, restoreWizardForm, type WizardForm } from "../utils/fixedTaskWizard";

/** État du formulaire de l'assistant ; le brouillon est gardé si on quitte l'écran (rememberKey). */
export function useFixedTaskWizardForm(defaultBranchId: string, rememberKey?: string) {
  const [form, setForm] = useState<WizardForm>(() =>
    restoreWizardForm(
      rememberKey ? readFixedTaskCreateForm(rememberKey) : null,
      newWizardForm(defaultBranchId),
    ),
  );
  const patch = useCallback((changes: Partial<WizardForm>) => {
    setForm((current) => ({ ...current, ...changes }));
  }, []);

  useEffect(() => {
    if (rememberKey) writeFixedTaskCreateForm(rememberKey, form);
  }, [rememberKey, form]);

  return { form, patch };
}
