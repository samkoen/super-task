import { useEffect, useState } from "react";
import { Box, ButtonBase } from "@mui/material";
import TaskChatDialog from "../tasks/TaskChatDialog";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { chatDraftFor, subtaskChoices } from "../../utils/flowChat";
import type { TaskCompletion, TaskStatus } from "../../services/taskService";

type Props = {
  open: boolean;
  /** Sous-tâche pré-sélectionnée (carte d'où l'on vient) ; null = « כללי ». */
  initialIndex: number | null;
  occurrenceId: string;
  title: string;
  status?: TaskStatus;
  completion?: TaskCompletion | null;
  requirements: CompletionRequirement[];
  onClose: () => void;
  onOccurrenceUpdated?: () => void;
};

function SubtaskPicker({ requirements, selected, onSelect }: {
  requirements: CompletionRequirement[];
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  const choices = subtaskChoices(requirements);
  if (choices.length <= 1) return null;
  return (
    <Box data-testid="flow-chat-picker" role="group" aria-label={he.flowChatPickSubtask} sx={{ display: "flex", gap: 1, p: 1.5, overflowX: "auto", flexShrink: 0 }}>
      {choices.map((choice) => {
        const active = choice.index === selected;
        return (
          <ButtonBase
            key={choice.index ?? "general"}
            data-testid="flow-chat-choice"
            aria-pressed={active}
            onClick={() => onSelect(choice.index)}
            sx={{
              ...flowText.label,
              px: 1.75,
              height: 32,
              flexShrink: 0,
              borderRadius: `${flowRadius.full}px`,
              whiteSpace: "nowrap",
              color: active ? flowColor.neutral0 : flowColor.neutral900,
              bgcolor: active ? flowColor.neutral900 : flowColor.neutral100,
            }}
          >
            {choice.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** Chat de la tâche avec sélecteur de sous-tâche : la question est pré-écrite pour la sous-tâche choisie. */
export default function FlowTaskChat({ open, initialIndex, occurrenceId, title, status, completion, requirements, onClose, onOccurrenceUpdated }: Props) {
  const [selected, setSelected] = useState<number | null>(initialIndex);
  useEffect(() => {
    if (open) setSelected(initialIndex);
  }, [open, initialIndex]);
  return (
    <TaskChatDialog
      open={open}
      onClose={onClose}
      occurrenceId={occurrenceId}
      title={title}
      status={status}
      employee
      completion={completion ?? null}
      initialDraft={chatDraftFor(requirements, selected)}
      onOccurrenceUpdated={() => onOccurrenceUpdated?.()}
      topSlot={<SubtaskPicker requirements={requirements} selected={selected} onSelect={setSelected} />}
    />
  );
}
