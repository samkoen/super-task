import { useState } from "react";
import { Box, Typography } from "@mui/material";
import TodayPeriodSection from "../../todaytasks/TodayPeriodSection";
import TodayTaskItem, { type TodayTaskTone } from "../../todaytasks/TodayTaskItem";
import type { TaskOccurrence } from "../../../services/taskService";
import { flowColor, flowSpace, flowText } from "../../../styles/flowTokens";
import { isRowChecked, taskRowState, taskRowSubtitle, taskRowTime, type PeriodGroup, type TaskRowState } from "../../../utils/managerTasksDay";

/** Seuls deux états se voient en plus de fait / pas fait : le retard (2e ligne rouge) et l'en-cours (contour orange). */
const TONE: Partial<Record<TaskRowState, TodayTaskTone>> = { late: "late", active: "active" };

function PeriodBlock({ group, shownDay, onOpen }: { group: PeriodGroup; shownDay: string; onOpen: (task: TaskOccurrence) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Box data-testid={`tasks-period-${group.period}`}>
      <TodayPeriodSection
        period={group.period}
        open={open}
        onToggle={() => setOpen((value) => !value)}
        counter={{ done: group.done, total: group.total }}
      >
        {group.tasks.map((task) => {
          const state = taskRowState(task);
          return (
            <TodayTaskItem
              key={task.id}
              testId={`tasks-row-${task.id}`}
              dataState={state}
              title={task.title}
              time={taskRowTime(task.due_at, shownDay)}
              subtitle={taskRowSubtitle(task)}
              done={isRowChecked(state)}
              tone={TONE[state]}
              onOpen={() => onOpen(task)}
            />
          );
        })}
      </TodayPeriodSection>
    </Box>
  );
}

type Props = { groups: PeriodGroup[]; shownDay: string; emptyText: string; onOpen: (task: TaskOccurrence) => void };

/**
 * Le jour du menahel en trois blocs (בוקר / צהריים / ערב), avec les mêmes composants que l'écran
 * « המשימות להיום » de l'oved (Figma FLOW 2 · 01). En plus : qui fait la tâche et son statut,
 * le compteur fait/total du bloc, le retard en rouge et la tâche en cours entourée d'orange.
 */
export default function ManagerTasksDayBoard({ groups, shownDay, emptyText, onOpen }: Props) {
  if (!groups.length) {
    return <Typography data-testid="tasks-empty" sx={{ ...flowText.body, textAlign: "center", color: flowColor.alphaNeutral900_60, py: 6 }}>{emptyText}</Typography>;
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: `${flowSpace.s16}px` }}>
      {groups.map((group) => <PeriodBlock key={group.period} group={group} shownDay={shownDay} onOpen={onOpen} />)}
    </Box>
  );
}
