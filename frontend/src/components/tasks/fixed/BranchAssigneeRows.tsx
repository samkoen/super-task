import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { he } from "../../../i18n/he";
import { employeeFieldSx } from "../../../styles/employeeUi";
import type { BranchAssigneeRow } from "../../../utils/fixedTaskWizard";

function AssigneeRow({
  row,
  onChange,
  disabled,
}: {
  row: BranchAssigneeRow;
  onChange: (branchId: string, userId: string) => void;
  disabled: boolean;
}) {
  if (row.candidates.length === 0) {
    return (
      <Box data-testid={`assignee-row-${row.branchId}`}>
        <Typography fontWeight={800}>{row.branchName}</Typography>
        <Typography color="warning.main">{he.fixedWizardNoEmployee}</Typography>
      </Box>
    );
  }
  return (
    <TextField
      select
      data-testid={`assignee-row-${row.branchId}`}
      label={he.fixedWizardBranchAssignee(row.branchName)}
      value={row.assigneeId}
      onChange={(e) => onChange(row.branchId, e.target.value)}
      disabled={disabled}
      fullWidth
      sx={employeeFieldSx}
    >
      {row.candidates.map((u) => (
        <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
      ))}
    </TextField>
  );
}

/** Un oved par snif choisi : le premier est proposé, on peut en prendre un autre avant de créer. */
export default function BranchAssigneeRows({
  rows,
  onChange,
  disabled = false,
}: {
  rows: BranchAssigneeRow[];
  onChange: (branchId: string, userId: string) => void;
  disabled?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {rows.map((row) => (
        <AssigneeRow key={row.branchId} row={row} onChange={onChange} disabled={disabled} />
      ))}
    </Box>
  );
}
