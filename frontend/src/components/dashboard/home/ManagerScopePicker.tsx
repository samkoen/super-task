import { MenuItem, TextField } from "@mui/material";
import type { Branch } from "../../../services/branchService";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";

type Props = { value: string; branches: Branch[]; onChange: (branchId: string) => void };

/** Pastille de périmètre du menahel reshet : « כל הרשת » ou un snif (vide = toute la reshet). */
export default function ManagerScopePicker({ value, branches, onChange }: Props) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ "aria-label": he.managerHomeScopeLabel, "data-testid": "manager-scope" }}
      SelectProps={{ displayEmpty: true }}
      sx={{
        alignSelf: "flex-start",
        minWidth: 160,
        "& .MuiOutlinedInput-root": {
          ...flowText.button,
          borderRadius: `${flowRadius.full}px`,
          bgcolor: flowColor.neutral0,
          "& fieldset": { borderColor: flowColor.neutral300 },
        },
      }}
    >
      <MenuItem value="">{he.managerHomeNetworkTitle}</MenuItem>
      {branches.map((b) => (
        <MenuItem key={b.id} value={b.id}>
          {b.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
