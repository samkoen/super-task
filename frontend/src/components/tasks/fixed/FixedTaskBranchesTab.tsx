import { Box, ButtonBase, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { FixedTaskBranch, FixedTaskGroup } from "../../../services/fixedTaskService";
import { he } from "../../../i18n/he";
import { EMPLOYEE_BRAND, employeeCardSx } from "../../../styles/employeeUi";
import { asText } from "../../../utils/asList";
import { branchOverrideSummary } from "../../../utils/fixedTaskGroups";
import { formatTemplateSchedule } from "../../../utils/fixedTaskTemplates";

function BranchLine({ group, branch }: { group: FixedTaskGroup; branch: FixedTaskBranch }) {
  const schedule = formatTemplateSchedule({
    ...group,
    due_time: branch.due_time,
    weekly_days: branch.weekly_days ?? group.weekly_days,
  });
  const assignee = asText(branch.assignee_name);
  return (
    <Box flex={1} minWidth={0}>
      <Typography fontWeight={800} sx={{ fontSize: "1.1rem" }}>{asText(branch.branch_name)}</Typography>
      {assignee ? (
        <Typography color="text.secondary">{assignee}</Typography>
      ) : (
        <Box display="flex" alignItems="center" gap={0.5} sx={{ color: "error.main" }}>
          <WarningAmberIcon sx={{ fontSize: 18 }} />
          <Typography fontWeight={700} sx={{ color: "inherit" }}>{he.fixedBranchNoAssignee}</Typography>
        </Box>
      )}
      <Typography fontWeight={700} sx={{ color: EMPLOYEE_BRAND }} mt={0.25}>{schedule}</Typography>
      {branch.overridden_fields.length ? (
        <Chip
          size="small"
          color="warning"
          sx={{ mt: 0.75 }}
          label={`${he.fixedBranchCustomized}: ${branchOverrideSummary(branch)}`}
        />
      ) : null}
    </Box>
  );
}

function BranchRow({
  group,
  branch,
  onOpen,
  onToggleActive,
}: {
  group: FixedTaskGroup;
  branch: FixedTaskBranch;
  onOpen: () => void;
  onToggleActive: () => void;
}) {
  const name = asText(branch.branch_name);
  return (
    <Box sx={{ ...employeeCardSx, p: 0, overflow: "hidden", opacity: branch.is_active ? 1 : 0.72 }}>
      <ButtonBase
        onClick={onOpen}
        aria-label={`${he.fixedBranchSheetTitle(name)}`}
        sx={{ display: "flex", width: "100%", textAlign: "start", p: 2, minHeight: 72, gap: 1 }}
      >
        <BranchLine group={group} branch={branch} />
        <ChevronLeftIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
      </ButtonBase>
      <Box sx={{ borderTop: 1, borderColor: "divider", px: 2, py: 0.5 }}>
        <FormControlLabel
          control={<Switch checked={branch.is_active} onChange={onToggleActive} />}
          label={branch.is_active ? he.active : he.inactive}
          sx={{ fontWeight: 700, minHeight: 48 }}
        />
      </Box>
    </Box>
  );
}

/** Une ligne par snif : qui exécute, à quelle heure, ce qui est adapté, et l'interrupteur propre au snif. */
export default function FixedTaskBranchesTab({
  group,
  onOpenBranch,
  onToggleActive,
}: {
  group: FixedTaskGroup;
  onOpenBranch: (branch: FixedTaskBranch) => void;
  onToggleActive: (branch: FixedTaskBranch) => void;
}) {
  return (
    <Box display="grid" gap={1.5} gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}>
      {group.branches.map((branch) => (
        <BranchRow
          key={branch.template_id}
          group={group}
          branch={branch}
          onOpen={() => onOpenBranch(branch)}
          onToggleActive={() => onToggleActive(branch)}
        />
      ))}
    </Box>
  );
}
