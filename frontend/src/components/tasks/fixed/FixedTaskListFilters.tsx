import { Box, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { Branch } from "../../../services/branchService";
import { he } from "../../../i18n/he";
import { employeeFieldSx } from "../../../styles/employeeUi";
import type { FixedGroupFilter } from "../../../utils/fixedTaskGroups";

/** Filtres de la liste : état, recherche par titre et (réseau) snif. */
export default function FixedTaskListFilters({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  branches,
  branchId,
  onBranchChange,
}: {
  filter: FixedGroupFilter;
  onFilterChange: (value: FixedGroupFilter) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** Vide pour un menahel snif (pas de filtre par snif). */
  branches: Branch[];
  branchId: string;
  onBranchChange: (value: string) => void;
}) {
  return (
    <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center" mb={2}>
      <ToggleButtonGroup
        exclusive
        value={filter}
        onChange={(_, v: FixedGroupFilter | null) => v && onFilterChange(v)}
        sx={{ "& .MuiToggleButton-root": { minHeight: 48, px: 2, fontWeight: 700 } }}
      >
        <ToggleButton value="all">{he.managerFixedTasksFilterAll}</ToggleButton>
        <ToggleButton value="active">{he.managerFixedTasksFilterActive}</ToggleButton>
        <ToggleButton value="inactive">{he.managerFixedTasksFilterInactive}</ToggleButton>
      </ToggleButtonGroup>
      <TextField
        label={he.fixedGroupSearch}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        sx={{ minWidth: 200, ...employeeFieldSx }}
      />
      {branches.length > 0 ? (
        <TextField
          select
          label={he.branch}
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
          sx={{ minWidth: 180, ...employeeFieldSx }}
        >
          <MenuItem value="">{he.all}</MenuItem>
          {branches.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </TextField>
      ) : null}
    </Box>
  );
}
