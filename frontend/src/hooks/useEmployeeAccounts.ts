import { useState } from "react";
import type { User } from "../services/api";
import { userService } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { employeeCreatePayload, employeeUpdatePayload, type EmployeeAccountForm } from "../utils/employeeAccountForm";

type Reload = () => Promise<void> | void;

/** Enregistre le formulaire d'un oved (création ou modification), avec sa photo. */
function useSaveEmployee(reload: Reload, close: () => void) {
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const save = async (edit: User | null, form: EmployeeAccountForm, avatar: File | null) => {
    setSaving(true);
    try {
      const res = edit
        ? await userService.updateTeamEmployee(edit.id, employeeUpdatePayload(form))
        : await userService.createTeamEmployee(employeeCreatePayload(form, user?.role === "network_manager"));
      if (avatar) await userService.uploadTeamAvatar(res.user.id, avatar);
      showSuccess(res.message || (edit ? he.employeeUpdated : he.employeeCreated));
      close();
      await reload();
    } catch (e) {
      showError(apiErrorMessage(e, he.errorGeneric));
    } finally {
      setSaving(false);
    }
  };
  return { saving, save };
}

/** Lance un appel de compte : message de succès, rechargement de la liste ; renvoie le résultat ou null. */
function useAccountCall(reload: Reload) {
  const { showSuccess, showError } = useFeedback();
  const [busy, setBusy] = useState(false);
  const run = async <T extends { message?: string }>(call: () => Promise<T>, fallback: string, refresh = true): Promise<T | null> => {
    setBusy(true);
    try {
      const res = await call();
      showSuccess(res.message || fallback);
      if (refresh) await reload();
      return res;
    } catch (e) {
      showError(apiErrorMessage(e, he.errorGeneric));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/**
 * Gestion des comptes oved de l'onglet « צוות » (ce que faisait l'ancien tableau « עובדים ») :
 * créer, modifier (photo, snifim), accès à l'application, mot de passe, voir comme l'oved.
 */
export function useEmployeeAccounts(reload: Reload) {
  const { viewAs } = useAuth();
  const { showError } = useFeedback();
  const [form, setForm] = useState<{ edit: User | null } | null>(null);
  const [access, setAccess] = useState<User | null>(null);
  const [password, setPassword] = useState<User | null>(null);
  const saver = useSaveEmployee(reload, () => setForm(null));
  const call = useAccountCall(reload);

  const toggleAccess = async () => {
    if (!access) return;
    const ok = await call.run(() => userService.setTeamEmployeeAccess(access.id, !access.is_active), access.is_active ? he.employeeAccessRevoked : he.employeeAccessGranted);
    if (ok) setAccess(null);
  };
  const resetPassword = async (value: string) => {
    if (!password) return;
    const ok = await call.run(() => userService.resetTeamEmployeePassword(password.id, value), he.employeePasswordReset, false);
    if (ok) setPassword(null);
  };
  const openAs = async (employee: User) => {
    try { await viewAs(employee.id); } catch (e) { showError(apiErrorMessage(e, he.errorGeneric)); }
  };
  return {
    form, openCreate: () => setForm({ edit: null }), openEdit: (u: User) => setForm({ edit: u }), closeForm: () => setForm(null),
    access, openAccess: setAccess, closeAccess: () => setAccess(null), toggleAccess,
    password, openPassword: setPassword, closePassword: () => setPassword(null), resetPassword,
    saving: saver.saving || call.busy, save: saver.save, run: call.run, viewAs: openAs,
  };
}

export type EmployeeAccounts = ReturnType<typeof useEmployeeAccounts>;
