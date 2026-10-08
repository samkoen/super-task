import { Box, ButtonBase, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import RepeatIcon from "@mui/icons-material/Repeat";
import type { TaskTemplate } from "../../services/taskService";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, employeeCardSx } from "../../styles/employeeUi";
import { asText } from "../../utils/asList";
import { formatTemplateSchedule, opsCategoryLabel } from "../../utils/fixedTaskTemplates";

/** Une tâche fixe sous forme de carte : on touche la carte pour la modifier, l'interrupteur l'active ou la met en pause. */
export default function FixedTemplateCard({
  template,
  networkChip,
  onEdit,
  onToggleActive,
}: {
  template: TaskTemplate;
  /** Texte de la pastille « dans N snifim » (absent si la tâche n'est pas en réseau). */
  networkChip?: string;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const title = asText(template.title) || he.taskTitle;
  const details = [asText(template.assignee_name), asText(template.branch_name)].filter(Boolean);
  return (
    <Box sx={{ ...employeeCardSx, p: 0, overflow: "hidden", opacity: template.is_active ? 1 : 0.72 }} data-active={template.is_active}>
      <ButtonBase
        onClick={onEdit}
        aria-label={`${he.edit}: ${title}`}
        sx={{ display: "block", width: "100%", textAlign: "start", p: 2, minHeight: 56 }}
      >
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography fontWeight={800} sx={{ fontSize: "1.1rem" }}>{title}</Typography>
          {networkChip ? <Chip size="small" color="info" label={networkChip} /> : null}
          {template.opened_by_delivery_note ? (
            <Chip size="small" color="success" variant="outlined" label={he.deliveryNotePdf} />
          ) : null}
        </Box>
        <Box display="flex" alignItems="center" gap={0.75} mt={0.75} sx={{ color: EMPLOYEE_BRAND }}>
          <RepeatIcon sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} sx={{ color: "inherit" }}>{formatTemplateSchedule(template)}</Typography>
        </Box>
        <Typography color="text.secondary" mt={0.5}>
          {details.length ? details.join(" · ") : he.noAssignee}
        </Typography>
        {template.ops_category ? (
          <Typography color="text.secondary" variant="body2">{opsCategoryLabel(template.ops_category)}</Typography>
        ) : null}
      </ButtonBase>
      <Box sx={{ borderTop: 1, borderColor: "divider", px: 2, py: 0.5 }}>
        <FormControlLabel
          control={<Switch checked={Boolean(template.is_active)} onChange={onToggleActive} />}
          label={template.is_active ? he.active : he.inactive}
          sx={{ fontWeight: 700, minHeight: 48 }}
        />
      </Box>
    </Box>
  );
}
