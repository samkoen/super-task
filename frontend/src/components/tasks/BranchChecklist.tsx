import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import {
  isAllBranchesSelected,
  toggleAllBranches,
  toggleBranchId,
} from "../../utils/fixedTaskCreateScope";

export default function BranchChecklist({
  branches,
  selectedIds,
  onChange,
  disabled = false,
}: {
  branches: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const allIds = branches.map((b) => b.id);
  const allSelected = isAllBranchesSelected(selectedIds, allIds);
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        px: 1.25,
        py: 0.75,
        maxHeight: 240,
        overflowY: "auto",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {he.fixedTaskSelectBranches}
      </Typography>
      <FormControlLabel
        sx={{ display: "flex", mr: 0 }}
        control={
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => onChange(toggleAllBranches(selectedIds, allIds))}
            disabled={disabled || allIds.length === 0}
          />
        }
        label={<Typography fontWeight={700}>{he.branchesSelectAll}</Typography>}
      />
      {branches.map((branch) => (
        <FormControlLabel
          key={branch.id}
          sx={{ display: "flex", mr: 0 }}
          control={
            <Checkbox
              checked={selectedIds.includes(branch.id)}
              onChange={() => onChange(toggleBranchId(selectedIds, branch.id))}
              disabled={disabled}
            />
          }
          label={branch.name}
        />
      ))}
    </Box>
  );
}
