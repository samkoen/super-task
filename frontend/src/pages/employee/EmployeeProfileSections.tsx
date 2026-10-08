import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  MenuItem,
  Paper,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EmployeeAvatar from "../../components/employee/EmployeeAvatar";
import { EMPLOYEE_LANGUAGES, EMPLOYEE_LANGUAGE_LABELS } from "../../domain/employeeLanguages";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import { he } from "../../i18n/he";
import {
  EMPLOYEE_BRAND,
  EMPLOYEE_BRAND_GRADIENT,
  EMPLOYEE_CARD_RADIUS,
  EMPLOYEE_TOUCH_MIN,
  employeeCardSx,
  employeeFieldSx,
  employeePrimaryButtonSx,
} from "../../styles/employeeUi";
import type { EmployeeProfileForm } from "./employeeProfileForm";

interface ProfileHeroProps {
  name: string;
  photoUrl?: string | null;
  slogan?: string | null;
  onEditPhoto: () => void;
  onDeletePhoto?: () => void;
}

/** Carte d'accueil du compte : grande photo cliquable, nom, slogan. */
export function ProfileHero({ name, photoUrl, slogan, onEditPhoto, onDeletePhoto }: ProfileHeroProps) {
  return (
    <Paper
      variant="outlined"
      data-testid="profile-hero"
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1,
        p: 3,
        color: "#fff",
        border: 0,
        borderRadius: EMPLOYEE_CARD_RADIUS,
        background: EMPLOYEE_BRAND_GRADIENT,
        boxShadow: `0 14px 34px ${alpha(EMPLOYEE_BRAND, 0.35)}`,
      }}
    >
      <EmployeeAvatar
        name={name}
        photoUrl={photoUrl}
        size={132}
        editable
        ring
        onEdit={onEditPhoto}
        onDelete={onDeletePhoto}
      />
      <Typography variant="h5" component="h1" fontWeight={900}>
        {name}
      </Typography>
      {slogan ? (
        <Typography fontWeight={700} sx={{ color: "#fff" }}>
          {slogan}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{ color: alpha("#fff", 0.8) }}>
        {he.profileHeroHint}
      </Typography>
    </Paper>
  );
}

interface ProfileDetailsCardProps {
  form: EmployeeProfileForm;
  saving: boolean;
  onChange: (next: EmployeeProfileForm) => void;
  onSave: () => void;
}

export function ProfileDetailsCard({ form, saving, onChange, onSave }: ProfileDetailsCardProps) {
  return (
    <Paper variant="outlined" sx={{ ...employeeCardSx, p: { xs: 2.5, sm: 3 } }}>
      <Typography variant="h6" component="h2" fontWeight={800} mb={2.5}>
        {he.profileDetails}
      </Typography>
      <Box display="flex" flexDirection="column" gap={2.5}>
        <TextField
          label={he.firstName}
          value={form.first_name}
          onChange={(e) => onChange({ ...form, first_name: e.target.value })}
          required
          fullWidth
          sx={employeeFieldSx}
        />
        <TextField
          label={he.lastName}
          value={form.last_name}
          onChange={(e) => onChange({ ...form, last_name: e.target.value })}
          required
          fullWidth
          sx={employeeFieldSx}
        />
        <LanguageField
          value={form.preferred_language}
          onChange={(lang) => onChange({ ...form, preferred_language: lang })}
        />
        <TextField
          label={he.phone}
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
          fullWidth
          dir="ltr"
          sx={employeeFieldSx}
        />
        <Button variant="contained" onClick={onSave} disabled={saving} sx={employeePrimaryButtonSx}>
          {saving ? <CircularProgress size={24} color="inherit" /> : he.saveProfile}
        </Button>
      </Box>
    </Paper>
  );
}

function LanguageField({
  value,
  onChange,
}: {
  value: EmployeeLanguage;
  onChange: (lang: EmployeeLanguage) => void;
}) {
  return (
    <TextField
      select
      label={he.myLanguage}
      value={value}
      onChange={(e) => onChange(e.target.value as EmployeeLanguage)}
      required
      fullWidth
      sx={employeeFieldSx}
    >
      {EMPLOYEE_LANGUAGES.map((lang) => (
        <MenuItem key={lang} value={lang} sx={{ minHeight: 48, fontSize: "1.05rem" }}>
          {EMPLOYEE_LANGUAGE_LABELS[lang]}
        </MenuItem>
      ))}
    </TextField>
  );
}

export interface PasswordFormValue {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ProfilePasswordCardProps {
  value: PasswordFormValue;
  saving: boolean;
  onChange: (next: PasswordFormValue) => void;
  onSave: () => void;
}

/** Changement de mot de passe replié par défaut : un écran moins chargé. */
export function ProfilePasswordCard({ value, saving, onChange, onSave }: ProfilePasswordCardProps) {
  const [open, setOpen] = useState(false);
  const mismatch = Boolean(value.new_password) && value.new_password !== value.confirm_password;
  return (
    <Paper variant="outlined" sx={{ ...employeeCardSx, overflow: "hidden" }}>
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        sx={toggleRowSx}
      >
        <LockOutlinedIcon sx={{ color: EMPLOYEE_BRAND }} />
        <Typography component="span" fontWeight={800} sx={{ flex: 1, textAlign: "start", fontSize: "1.05rem" }}>
          {he.changePassword}
        </Typography>
        <ExpandMoreRoundedIcon
          sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </Box>
      <Collapse in={open} unmountOnExit>
        <PasswordFields value={value} mismatch={mismatch} saving={saving} onChange={onChange} onSave={onSave} />
      </Collapse>
    </Paper>
  );
}

const toggleRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 1.5,
  width: "100%",
  minHeight: EMPLOYEE_TOUCH_MIN + 8,
  px: 2.5,
  border: 0,
  bgcolor: "transparent",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
} as const;

function PasswordFields({
  value,
  mismatch,
  saving,
  onChange,
  onSave,
}: ProfilePasswordCardProps & { mismatch: boolean }) {
  const field = (key: keyof PasswordFormValue, label: string) => (
    <TextField
      label={label}
      type="password"
      value={value[key]}
      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
      required
      fullWidth
      dir="ltr"
      sx={employeeFieldSx}
    />
  );
  return (
    <Box display="flex" flexDirection="column" gap={2.5} px={2.5} pb={2.5}>
      <Typography variant="body2" color="text.secondary">
        {he.changePasswordHint}
      </Typography>
      {field("current_password", he.currentPassword)}
      {field("new_password", he.newPassword)}
      {field("confirm_password", he.confirmPassword)}
      {mismatch ? <Alert severity="warning">{he.passwordMismatch}</Alert> : null}
      <Button variant="contained" onClick={onSave} disabled={saving} sx={employeePrimaryButtonSx}>
        {saving ? <CircularProgress size={24} color="inherit" /> : he.changePassword}
      </Button>
    </Box>
  );
}
