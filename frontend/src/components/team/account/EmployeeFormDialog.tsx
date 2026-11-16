import { useEffect, useRef, useState } from "react";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { User } from "../../../services/api";
import type { Branch } from "../../../services/branchService";
import { userService } from "../../../services/userService";
import { useAuth } from "../../../context/AuthContext";
import type { EmployeeAccounts } from "../../../hooks/useEmployeeAccounts";
import { he } from "../../../i18n/he";
import { addableEmployeeBranches, canAddToMyBranch, emptyEmployeeForm, employeeFormFromUser, type EmployeeAccountForm } from "../../../utils/employeeAccountForm";
import { studioPrimarySx } from "../../tasks/fixed/studio/studioUi";
import { EmployeeAvatarField, EmployeeIdentityFields, EmployeeMemberships, EmployeeRoleFields } from "./EmployeeFormFields";

/** État du formulaire, remis à zéro à chaque ouverture (nouvel oved ou oved modifié). */
function useEmployeeFormState(open: boolean, edit: User | null, defaultBranchId: string) {
  const [form, setForm] = useState<EmployeeAccountForm>(emptyEmployeeForm(defaultBranchId));
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [addBranchId, setAddBranchId] = useState("");
  // Clé d'ouverture : un snif ajouté met `edit` à jour sans effacer ce qui est en cours de saisie.
  const initKey = open ? `${edit?.id ?? "new"}:${defaultBranchId}` : "";
  const editRef = useRef(edit);
  editRef.current = edit;
  useEffect(() => {
    if (!initKey) return;
    const current = editRef.current;
    setForm(current ? employeeFormFromUser(current) : emptyEmployeeForm(defaultBranchId));
    setAvatar(null);
    setPreview(current?.avatar_url ?? "");
    setAddBranchId("");
  }, [initKey, defaultBranchId]);
  const pick = (file: File) => { setAvatar(file); setPreview(URL.createObjectURL(file)); };
  return { form, patch: (p: Partial<EmployeeAccountForm>) => setForm((f) => ({ ...f, ...p })), avatar, preview, pick, clearPreview: () => { setAvatar(null); setPreview(""); }, addBranchId, setAddBranchId };
}

type Props = { accounts: EmployeeAccounts; branches: Branch[] };

/** Fiche de compte d'un oved : création (« עובד חדש ») ou modification, comme l'ancien tableau. */
export default function EmployeeFormDialog({ accounts, branches }: Props) {
  const { user } = useAuth();
  const isNetworkManager = user?.role === "network_manager";
  const edit = accounts.form?.edit ?? null;
  const open = Boolean(accounts.form);
  const s = useEmployeeFormState(open, edit, isNetworkManager ? "" : user?.branch_id ?? "");
  const targetBranch = isNetworkManager ? s.addBranchId : user?.branch_id ?? "";
  const addBranch = async () => {
    if (!edit || !targetBranch) return;
    const res = await accounts.run(() => userService.addTeamEmployeeMembership(edit.id, targetBranch), he.employeeBranchAdded);
    if (res) { accounts.openEdit(res.user); s.setAddBranchId(""); }
  };
  const deleteAvatar = edit ? () => { s.clearPreview(); void accounts.run(() => userService.deleteTeamAvatar(edit.id).then(() => ({ message: "" })), he.employeePhotoDeleted); } : undefined;
  return (
    <Dialog open={open} onClose={accounts.closeForm} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{edit ? he.editEmployee : he.newEmployee}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <EmployeeAvatarField name={`${s.form.first_name} ${s.form.last_name}`.trim()} preview={s.preview} onPick={s.pick} onDelete={s.preview ? deleteAvatar ?? s.clearPreview : undefined} />
        <EmployeeIdentityFields form={s.form} creating={!edit} onChange={s.patch} />
        <EmployeeRoleFields form={s.form} branches={isNetworkManager && !edit ? branches : null} onChange={s.patch} />
        {edit ? (
          <EmployeeMemberships
            user={edit}
            addable={isNetworkManager ? addableEmployeeBranches(edit, branches) : null}
            addBranchId={s.addBranchId}
            canAddMine={user?.role === "branch_manager" && canAddToMyBranch(edit, user.branch_id)}
            saving={accounts.saving}
            onAddBranchId={s.setAddBranchId}
            onAdd={() => void addBranch()}
          />
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={accounts.closeForm} disabled={accounts.saving}>{he.cancel}</Button>
        <Button data-testid="employee-form-submit" onClick={() => void accounts.save(edit, s.form, s.avatar)} disabled={accounts.saving} sx={{ ...studioPrimarySx, width: "auto", height: 44, px: 3 }}>
          {accounts.saving ? <CircularProgress size={22} color="inherit" /> : he.submit}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
