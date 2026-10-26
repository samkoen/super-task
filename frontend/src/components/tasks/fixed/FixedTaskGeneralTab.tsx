import { useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { User } from "../../../services/api";
import type { FixedTaskGroup } from "../../../services/fixedTaskService";
import { he } from "../../../i18n/he";
import { employeePrimaryButtonSx } from "../../../styles/employeeUi";
import { applyReferenceTranscript } from "../../../utils/applyReferenceTranscript";
import { assigneesForBranch } from "../../../utils/assigneeOptions";
import {
  fixedGroupImpactText,
  groupToGeneralForm,
  groupToMedia,
  type FixedGeneralForm,
} from "../../../utils/fixedTaskGroups";
import { startUrlFieldError } from "../../../utils/startUrl";
import type { TaskReferenceMediaValue } from "../TaskReferenceMediaEditor";
import FixedTaskGeneralForm from "./FixedTaskGeneralForm";

function validateGeneral(group: FixedTaskGroup, form: FixedGeneralForm): string | null {
  if (!group.is_network && !form.assignee_user_id.trim()) return he.newTaskAssigneeRequired;
  return startUrlFieldError(form.start_url) || null;
}

async function transcriptPatch(
  form: FixedGeneralForm,
  transcript: string,
  employees: User[],
): Promise<Partial<FixedGeneralForm>> {
  try {
    const applied = await applyReferenceTranscript({
      transcript,
      currentTitle: form.title,
      currentDescription: form.description,
      currentAssigneeId: form.assignee_user_id,
      employees: employees.map((u) => ({ id: u.id, full_name: u.full_name })),
      lockAssignee: true,
    });
    return { title: applied.title, description: applied.description };
  } catch {
    return {}; // l'IA du titre est facultative : on garde les champs actuels
  }
}

/** Onglet « הגדרות כלליות » : formulaire + barre d'enregistrement qui annonce l'impact sur les snifim. */
export default function FixedTaskGeneralTab({
  group,
  employees,
  currentUserId,
  saving,
  onSave,
  onDelete,
  onError,
  onLinkCustomer,
}: {
  group: FixedTaskGroup;
  employees: User[];
  currentUserId?: string;
  saving: boolean;
  onSave: (form: FixedGeneralForm, media: TaskReferenceMediaValue) => Promise<boolean>;
  onDelete: () => void;
  onError: (message: string) => void;
  onLinkCustomer?: (customerName: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState<FixedGeneralForm>(() => groupToGeneralForm(group));
  const [media, setMedia] = useState<TaskReferenceMediaValue>(() => groupToMedia(group));
  const branchStaff = group.is_network
    ? employees
    : assigneesForBranch(employees, group.branches[0]?.branch_id, currentUserId);

  const submit = () => {
    const error = validateGeneral(group, form);
    if (error) onError(error);
    else void onSave(form, media);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {group.is_network ? (
        <Typography color="text.secondary">{he.fixedDetailGeneralHint}</Typography>
      ) : null}
      <FixedTaskGeneralForm
        group={group}
        form={form}
        onFormChange={setForm}
        media={media}
        onMediaChange={setMedia}
        employees={branchStaff}
        currentUserId={currentUserId}
        saving={saving}
        onTranscript={(t) => void transcriptPatch(form, t, employees).then((p) => setForm((f) => ({ ...f, ...p })))}
        onError={onError}
        onLinkCustomer={onLinkCustomer}
      />
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 2,
          bgcolor: "background.default",
          borderTop: 1,
          borderColor: "divider",
          py: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {group.is_network ? (
          <Typography variant="body2" color="text.secondary" data-testid="fixed-impact">
            {fixedGroupImpactText(group)}
          </Typography>
        ) : null}
        <Button variant="contained" onClick={submit} disabled={saving} sx={employeePrimaryButtonSx}>
          {saving ? <CircularProgress size={24} color="inherit" /> : he.fixedDetailSave}
        </Button>
      </Box>
      <Button
        color="error"
        variant="outlined"
        startIcon={<DeleteOutlineIcon />}
        onClick={onDelete}
        disabled={saving}
        sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 700 }}
      >
        {group.is_network ? he.fixedDetailDeleteNetwork : he.managerFixedTasksDelete}
      </Button>
    </Box>
  );
}
