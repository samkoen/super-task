import type { ReactNode } from "react";
import { Box, ButtonBase, Switch, Typography } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { he } from "../../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../../styles/flowTokens";
import DeliveryNoteTemplateFields from "../../form/DeliveryNoteTemplateFields";
import TaskAdvancedFields, { type TaskAdvancedValue } from "../../form/TaskAdvancedFields";
import TaskReferenceMediaEditor, { type TaskReferenceMediaValue } from "../../TaskReferenceMediaEditor";
import StudioSheet from "./StudioSheet";
import { studioPrimarySx } from "./studioUi";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "10px", p: "16px", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral100 }}>
      <Typography sx={{ ...flowText.button, fontSize: 16, color: flowColor.neutral900 }}>{title}</Typography>
      {children}
    </Box>
  );
}

export type StudioMoreSheetProps = {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  media: TaskReferenceMediaValue;
  onMediaChange: (media: TaskReferenceMediaValue) => void;
  onTranscript: (transcript: string) => void;
  onError?: (message: string) => void;
  advanced: TaskAdvancedValue;
  onAdvancedChange: (patch: Partial<TaskAdvancedValue>) => void;
  /** Absent (tâche du jour) : pas de bloc « תעודת משלוח ». */
  delivery?: { enabled: boolean; taskType: string };
  onDeliveryChange?: (patch: { enabled?: boolean; taskType?: string }) => void;
  /** « ad_hoc » : seulement le lien de départ (pas de catégorie ni début/fin de journée). */
  advancedKind?: "fixed" | "ad_hoc";
  /** Actions propres à l'édition (rattacher un client Agroline). */
  deliveryExtra?: ReactNode;
  /** Édition seulement : interrupteur « פעילה ». */
  active?: { value: boolean; onChange: (value: boolean) => void };
  /** Édition seulement : suppression (libellé selon tâche réseau / snif). */
  remove?: { label: string; onClick: () => void };
};

/**
 * « הגדרות נוספות » : tout ce qui sert rarement, sorti de l'écran principal pour le garder simple
 * (fichiers joints, lien de départ, catégorie, bon de livraison, statut, suppression).
 */
export default function StudioMoreSheet(props: StudioMoreSheetProps) {
  const { open, onClose, disabled = false } = props;
  return (
    <StudioSheet open={open} title={he.studioMore} onClose={onClose} testId="studio-more-sheet">
      {props.active ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "16px", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral100 }}>
          <Box>
            <Typography sx={{ ...flowText.button, fontSize: 16, color: flowColor.neutral900 }}>{he.studioStatusTitle}</Typography>
            <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{he.studioStatusHint}</Typography>
          </Box>
          <Switch
            checked={props.active.value}
            disabled={disabled}
            onChange={(e) => props.active?.onChange(e.target.checked)}
            inputProps={{ "aria-label": he.studioStatusTitle }}
          />
        </Box>
      ) : null}
      <Block title={he.studioReferenceTitle}>
        <TaskReferenceMediaEditor
          value={props.media}
          onChange={props.onMediaChange}
          onDescriptionAppend={props.onTranscript}
          disabled={disabled}
          onError={props.onError}
        />
      </Block>
      {props.delivery ? (
        <Block title={he.deliveryNoteSectionTitle}>
          <DeliveryNoteTemplateFields
            enabled={props.delivery.enabled}
            onEnabledChange={(enabled) => props.onDeliveryChange?.({ enabled })}
            taskType={props.delivery.taskType}
            onTaskTypeChange={(taskType) => props.onDeliveryChange?.({ taskType })}
            disabled={disabled}
          >
            {props.deliveryExtra}
          </DeliveryNoteTemplateFields>
        </Block>
      ) : null}
      <TaskAdvancedFields
        taskKind={props.advancedKind ?? "fixed"}
        value={props.advanced}
        onChange={props.onAdvancedChange}
        open
        onOpenChange={() => undefined}
        disabled={disabled}
      />
      {props.remove ? (
        <ButtonBase
          data-testid="studio-delete"
          onClick={props.remove.onClick}
          disabled={disabled}
          sx={{ height: 52, gap: "8px", borderRadius: `${flowRadius.sm}px`, border: "1px solid rgba(179,38,30,0.35)", color: "#b3261e", ...flowText.button }}
        >
          <DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
          {props.remove.label}
        </ButtonBase>
      ) : null}
      <ButtonBase onClick={onClose} sx={studioPrimarySx}>
        {he.studioDone}
      </ButtonBase>
    </StudioSheet>
  );
}
