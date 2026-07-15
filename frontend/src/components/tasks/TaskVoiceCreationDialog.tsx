import { Dialog, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import TaskVoiceAssistant, { type TaskVoiceFillResult } from "../ai/TaskVoiceAssistant";
import { he } from "../../i18n/he";
import type { Branch } from "../../services/branchService";

interface TaskVoiceCreationDialogProps {
  open: boolean;
  taskKind: "fixed" | "ad_hoc";
  branchId: string;
  branches: Branch[];
  isBranchManager: boolean;
  onBranchChange: (branchId: string) => void;
  onClose: () => void;
  onFilled: (data: TaskVoiceFillResult) => void;
  onError?: (message: string) => void;
}

export default function TaskVoiceCreationDialog({
  open,
  taskKind,
  branchId,
  branches,
  isBranchManager,
  onBranchChange,
  onClose,
  onFilled,
  onError,
}: TaskVoiceCreationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.taskCreationModeVoice}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          select
          label={he.branch}
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
          required
          fullWidth
          disabled={isBranchManager}
        >
          {branches.map((branch) => (
            <MenuItem key={branch.id} value={branch.id}>
              {branch.name}
            </MenuItem>
          ))}
        </TextField>
        <TaskVoiceAssistant
          branchId={branchId}
          taskKind={taskKind}
          onFilled={(data) => {
            onFilled(data);
            onClose();
          }}
          onError={onError}
        />
      </DialogContent>
    </Dialog>
  );
}
