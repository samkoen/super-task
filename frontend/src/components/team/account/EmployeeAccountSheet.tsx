import { Box } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import type { User } from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import type { EmployeeAccounts } from "../../../hooks/useEmployeeAccounts";
import { he } from "../../../i18n/he";
import { employeeLanguageLabel } from "../../../domain/employeeLanguages";
import ManagerSheetRow from "../../Layout/managerShell/ManagerSheetRow";
import StudioSheet from "../../tasks/fixed/studio/StudioSheet";

type Props = { user: User | null; accounts: EmployeeAccounts; onClose: () => void };

/** Ligne d'identité sous le titre : identifiant, téléphone, fonction, langue. */
function accountSubtitle(user: User): string {
  const job = user.job_function ? he.jobFunctionLabels[user.job_function] : "";
  return [user.email, user.phone, job, employeeLanguageLabel(user.preferred_language)].filter(Boolean).join(" · ");
}

/**
 * « ניהול חשבון » d'un oved, en feuille du bas : modifier, mot de passe, accès, voir comme lui.
 * Chaque choix ferme la feuille puis ouvre sa fenêtre (la feuille passe au-dessus des dialogues).
 */
export default function EmployeeAccountSheet({ user, accounts, onClose }: Props) {
  const { user: me } = useAuth();
  const pick = (action: (u: User) => void) => () => { if (!user) return; onClose(); action(user); };
  return (
    <StudioSheet open={Boolean(user)} title={user?.full_name ?? ""} subtitle={user ? accountSubtitle(user) : undefined} onClose={onClose} testId="employee-account-sheet">
      {user ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ManagerSheetRow testId="employee-account-edit" label={he.editEmployee} icon={<EditOutlinedIcon />} onClick={pick(accounts.openEdit)} />
          <ManagerSheetRow testId="employee-account-password" label={he.resetEmployeePassword} icon={<VpnKeyOutlinedIcon />} onClick={pick(accounts.openPassword)} />
          {user.id !== me?.id ? (
            <ManagerSheetRow
              testId="employee-account-access"
              label={user.is_active ? he.revokeAppAccess : he.grantAppAccess}
              icon={user.is_active ? <LockOutlinedIcon /> : <LockOpenOutlinedIcon />}
              onClick={pick(accounts.openAccess)}
            />
          ) : null}
          {user.is_active ? (
            <ManagerSheetRow testId="employee-account-view-as" label={he.viewAsEmployee} icon={<VisibilityOutlinedIcon />} onClick={pick((u) => void accounts.viewAs(u))} />
          ) : null}
        </Box>
      ) : null}
    </StudioSheet>
  );
}
