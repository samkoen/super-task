import { MenuItem, TextField } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { he } from "../../i18n/he";

/** Sélecteur snif actif pour oved multi-snif (≥2 memberships). */
export default function EmployeeBranchSwitcher({ dense = false }: { dense?: boolean }) {
  const { user, setActiveBranch } = useAuth();
  const branches = user?.branches ?? [];
  if (user?.role !== "employee" || branches.length < 2) return null;

  const value = user.active_branch_id || user.branch_id || branches[0]?.branch_id || "";

  return (
    <TextField
      select
      size={dense ? "small" : "medium"}
      fullWidth
      label={he.activeBranch}
      value={value}
      onChange={(e) => {
        void setActiveBranch(e.target.value);
      }}
      sx={
        dense
          ? {
              "& .MuiInputBase-root": { color: "inherit" },
              "& .MuiInputLabel-root": { color: "inherit", opacity: 0.7 },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
              "& .MuiSvgIcon-root": { color: "inherit" },
            }
          : undefined
      }
    >
      {branches.map((b) => (
        <MenuItem key={b.branch_id} value={b.branch_id}>
          {b.branch_name || b.branch_id}
        </MenuItem>
      ))}
    </TextField>
  );
}
