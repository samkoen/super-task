import { MenuItem, TextField } from "@mui/material";
import { he } from "../../i18n/he";
import {
  DELIVERY_TASK_LINE_CHECK,
  DELIVERY_TASK_ORIGIN,
  DELIVERY_TASK_TYPES,
} from "../../utils/deliveryNote";

const LABELS: Record<(typeof DELIVERY_TASK_TYPES)[number], string> = {
  [DELIVERY_TASK_LINE_CHECK]: he.deliveryNoteTaskTypeLineCheck,
  [DELIVERY_TASK_ORIGIN]: he.deliveryNoteTaskTypeOrigin,
};

type Props = {
  value: string | null | undefined;
  onChange: (value: string) => void;
};

export default function DeliveryTaskTypeField({ value, onChange }: Props) {
  return (
    <TextField
      select
      label={he.deliveryNoteTaskType}
      value={value || DELIVERY_TASK_LINE_CHECK}
      onChange={(event) => onChange(event.target.value)}
      fullWidth
    >
      {DELIVERY_TASK_TYPES.map((type) => (
        <MenuItem key={type} value={type}>
          {LABELS[type]}
        </MenuItem>
      ))}
    </TextField>
  );
}
