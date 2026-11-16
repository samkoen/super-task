import { Box, Button, Chip, MenuItem, TextField, Typography } from "@mui/material";
import type { JobFunction, User } from "../../../services/api";
import type { Branch } from "../../../services/branchService";
import { EMPLOYEE_LANGUAGES, EMPLOYEE_LANGUAGE_LABELS, type EmployeeLanguage } from "../../../domain/employeeLanguages";
import { he } from "../../../i18n/he";
import { flowColor, flowText } from "../../../styles/flowTokens";
import { EMPLOYEE_JOB_FUNCTIONS, type EmployeeAccountForm } from "../../../utils/employeeAccountForm";
import EmployeeAvatar from "../../employee/EmployeeAvatar";
import { studioFieldSx } from "../../tasks/fixed/studio/studioUi";

type Patch = (patch: Partial<EmployeeAccountForm>) => void;

/** Photo de l'oved : aperçu, choix d'un fichier, suppression. */
export function EmployeeAvatarField({ name, preview, onPick, onDelete }: { name: string; preview: string; onPick: (file: File) => void; onDelete?: () => void }) {
  return (
    <Box display="flex" alignItems="center" gap={2}>
      <EmployeeAvatar name={name || he.employeeAvatar} photoUrl={preview || null} size={72} onDelete={onDelete} />
      <Box>
        <Button component="label" variant="outlined" size="small">
          {he.employeeAvatar}
          <input hidden type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) onPick(file); }} />
        </Button>
        <Typography sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_60, mt: 0.5 }}>{he.employeeAvatarHint}</Typography>
      </Box>
    </Box>
  );
}

/** Champs d'identité et de connexion (le mot de passe seulement à la création). */
export function EmployeeIdentityFields({ form, creating, onChange }: { form: EmployeeAccountForm; creating: boolean; onChange: Patch }) {
  return (
    <>
      <TextField label={he.firstName} value={form.first_name} onChange={(e) => onChange({ first_name: e.target.value })} required fullWidth sx={studioFieldSx} />
      <TextField label={he.lastName} value={form.last_name} onChange={(e) => onChange({ last_name: e.target.value })} required fullWidth sx={studioFieldSx} />
      <TextField label={he.loginIdentifier} helperText={he.loginIdentifierHint} value={form.email} onChange={(e) => onChange({ email: e.target.value })} required fullWidth dir="ltr" sx={studioFieldSx} />
      {creating ? (
        <TextField label={he.password} type="password" value={form.password} onChange={(e) => onChange({ password: e.target.value })} required fullWidth dir="ltr" sx={studioFieldSx} />
      ) : null}
      <TextField label={he.phone} value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} fullWidth dir="ltr" sx={studioFieldSx} />
    </>
  );
}

/** Fonction, snif (création par le menahel reshet) et langue de l'application. */
export function EmployeeRoleFields({ form, branches, onChange }: { form: EmployeeAccountForm; branches: Branch[] | null; onChange: Patch }) {
  return (
    <>
      <TextField select label={he.jobFunction} value={form.job_function} onChange={(e) => onChange({ job_function: e.target.value as JobFunction })} required fullWidth sx={studioFieldSx}>
        {EMPLOYEE_JOB_FUNCTIONS.map((jf) => <MenuItem key={jf} value={jf}>{he.jobFunctionLabels[jf]}</MenuItem>)}
      </TextField>
      {branches ? (
        <TextField select label={he.branch} value={form.branch_id} onChange={(e) => onChange({ branch_id: e.target.value })} required fullWidth sx={studioFieldSx}>
          {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
      ) : null}
      <TextField select label={he.employeeLanguage} value={form.preferred_language} onChange={(e) => onChange({ preferred_language: e.target.value as EmployeeLanguage })} required fullWidth sx={studioFieldSx}>
        {EMPLOYEE_LANGUAGES.map((lang) => <MenuItem key={lang} value={lang}>{EMPLOYEE_LANGUAGE_LABELS[lang]}</MenuItem>)}
      </TextField>
    </>
  );
}

type MembershipProps = {
  user: User;
  addable: Branch[] | null;
  addBranchId: string;
  canAddMine: boolean;
  saving: boolean;
  onAddBranchId: (id: string) => void;
  onAdd: () => void;
};

/** Snifim de l'oved ; le menahel reshet en ajoute un, le menahel snif le rattache au sien. */
export function EmployeeMemberships({ user, addable, addBranchId, canAddMine, saving, onAddBranchId, onAdd }: MembershipProps) {
  const memberships = user.branches ?? [];
  return (
    <Box>
      <Typography sx={{ ...flowText.button, mb: 1 }}>{he.employeeBranches}</Typography>
      <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5}>
        {memberships.length > 0
          ? memberships.map((b) => <Chip key={b.branch_id} size="small" label={b.branch_name || b.branch_id} color={b.is_primary ? "primary" : "default"} />)
          : <Chip size="small" label={user.branch_name || user.branch_id || "—"} color="primary" />}
      </Box>
      {addable ? (addable.length > 0 ? (
        <Box display="flex" gap={1} alignItems="flex-start">
          <TextField select size="small" fullWidth label={he.addEmployeeBranch} value={addBranchId} onChange={(e) => onAddBranchId(e.target.value)}>
            {addable.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
          <Button variant="outlined" disabled={saving || !addBranchId} onClick={onAdd} sx={{ whiteSpace: "nowrap", mt: 0.5 }}>{he.addEmployeeBranch}</Button>
        </Box>
      ) : <Typography sx={{ ...flowText.caption, color: flowColor.alphaNeutral900_60 }}>{he.noMoreBranchesToAdd}</Typography>) : null}
      {canAddMine ? <Button variant="outlined" size="small" disabled={saving} onClick={onAdd}>{he.addToMyBranch}</Button> : null}
    </Box>
  );
}
