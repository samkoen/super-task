import type { ReactNode } from "react";
import { Box, FormControlLabel, Switch, Typography } from "@mui/material";
import { he } from "../../../i18n/he";
import DeliveryTaskTypeField from "../DeliveryTaskTypeField";

/**
 * Lien avec les teudot Agroline : un interrupteur clair, puis (si activé) ce que l'oved devra faire.
 * `children` accueille les actions propres à l'édition (ex. rattacher un client).
 */
export default function DeliveryNoteTemplateFields({
  enabled,
  onEnabledChange,
  taskType,
  onTaskTypeChange,
  disabled = false,
  children,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  taskType: string | null | undefined;
  onTaskTypeChange: (taskType: string) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <FormControlLabel
        control={
          <Switch checked={enabled} disabled={disabled} onChange={(e) => onEnabledChange(e.target.checked)} />
        }
        label={<Typography fontWeight={800}>{he.deliveryNoteOpenModel}</Typography>}
        sx={{ mx: 0, minHeight: 48 }}
      />
      <Typography color="text.secondary">{he.deliveryNoteOpenModelHint}</Typography>
      {enabled ? (
        <>
          <Typography fontWeight={700}>{he.deliveryNoteTaskType}</Typography>
          <DeliveryTaskTypeField value={taskType} onChange={onTaskTypeChange} disabled={disabled} />
          {children}
        </>
      ) : null}
    </Box>
  );
}
