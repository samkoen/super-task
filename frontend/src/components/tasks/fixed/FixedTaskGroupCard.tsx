import { Box, ButtonBase, Chip, Typography } from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import type { FixedTaskGroup } from "../../../services/fixedTaskService";
import { he } from "../../../i18n/he";
import { EMPLOYEE_BRAND, employeeCardSx } from "../../../styles/employeeUi";
import { asText } from "../../../utils/asList";
import { fixedGroupChips } from "../../../utils/fixedTaskGroups";
import { formatTemplateSchedule } from "../../../utils/fixedTaskTemplates";

function CardChips({ group }: { group: FixedTaskGroup }) {
  const chips = fixedGroupChips(group);
  return (
    <Box display="flex" gap={0.75} flexWrap="wrap" mt={1}>
      {chips.network ? <Chip size="small" color="info" label={chips.network} /> : null}
      {chips.customized ? <Chip size="small" color="warning" label={chips.customized} /> : null}
      {chips.unassigned ? <Chip size="small" color="error" variant="outlined" label={chips.unassigned} /> : null}
      {!group.is_network && group.active_count === 0 ? (
        <Chip size="small" variant="outlined" label={he.fixedGroupStatusInactive} />
      ) : null}
      {group.opened_by_delivery_note ? (
        <Chip size="small" color="success" variant="outlined" label={he.deliveryNotePdf} />
      ) : null}
    </Box>
  );
}

function cardSubtitle(group: FixedTaskGroup): string {
  if (group.is_network) return he.fixedGroupActiveOf(group.active_count, group.branch_count);
  const first = group.branches[0];
  const parts = [asText(first?.assignee_name), asText(first?.branch_name)].filter(Boolean);
  return parts.length ? parts.join(" · ") : he.noAssignee;
}

/** Une tâche fixe = une carte (et non une carte par snif) : on la touche pour ouvrir sa page. */
export default function FixedTaskGroupCard({
  group,
  onOpen,
}: {
  group: FixedTaskGroup;
  onOpen: () => void;
}) {
  const title = asText(group.title) || he.taskTitle;
  const paused = group.active_count === 0;
  return (
    <Box sx={{ ...employeeCardSx, p: 0, overflow: "hidden", opacity: paused ? 0.72 : 1 }}>
      <ButtonBase
        onClick={onOpen}
        aria-label={`${he.edit}: ${title}`}
        sx={{ display: "flex", width: "100%", textAlign: "start", p: 2, minHeight: 72, gap: 1 }}
      >
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={800} sx={{ fontSize: "1.1rem" }}>{title}</Typography>
          <Box display="flex" alignItems="center" gap={0.75} mt={0.75} sx={{ color: EMPLOYEE_BRAND }}>
            <RepeatIcon sx={{ fontSize: 20 }} />
            <Typography fontWeight={700} sx={{ color: "inherit" }}>{formatTemplateSchedule(group)}</Typography>
          </Box>
          <Typography color="text.secondary" mt={0.5}>{cardSubtitle(group)}</Typography>
          <CardChips group={group} />
        </Box>
        <ChevronLeftIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
      </ButtonBase>
    </Box>
  );
}
