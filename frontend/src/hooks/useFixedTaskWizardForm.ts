import { useCallback, useEffect, useState } from "react";
import {
  readFixedTaskCreateForm,
  writeFixedTaskCreateForm,
} from "../utils/fixedTaskScreenDraft";
import { newWizardForm, restoreWizardForm, type WizardForm } from "../utils/fixedTaskWizard";

/**
 * État du formulaire du studio ; le brouillon est gardé si on quitte l'écran (rememberKey).
 * `initial` pré-remplit un formulaire neuf (« פעם אחת », modèle de la bibliothèque, signalement).
 */
export function useFixedTaskWizardForm(defaultBranchId: string, rememberKey?: string, initial?: Partial<WizardForm>) {
  const [form, setForm] = useState<WizardForm>(() =>
    restoreWizardForm(
      rememberKey ? readFixedTaskCreateForm(rememberKey) : null,
      { ...newWizardForm(defaultBranchId), ...initial },
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
