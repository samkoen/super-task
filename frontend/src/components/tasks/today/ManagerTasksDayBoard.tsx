import { useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import WbTwilightOutlinedIcon from "@mui/icons-material/WbTwilightOutlined";
import type { TaskOccurrence } from "../../../services/taskService";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";
import type { DayPeriod } from "../../../utils/managerHome";
import { isRowChecked, taskRowState, taskRowSubtitle, taskRowTime, type PeriodGroup, type TaskRowState } from "../../../utils/managerTasksDay";

/** Couleurs des blocs du Figma : orange le matin, vert à midi, noir le soir. */
const PERIOD_LOOK: Record<DayPeriod, { bg: string; text: string; Icon: typeof WbSunnyOutlinedIcon }> = {
  morning: { bg: flowColor.orange500, text: flowColor.neutral0, Icon: WbSunnyOutlinedIcon },
  noon: { bg: flowColor.green300, text: flowColor.neutral900, Icon: WbTwilightOutlinedIcon },
  evening: { bg: flowColor.neutral900, text: flowColor.neutral0, Icon: DarkModeOutlinedIcon },
};

const ROW_LOOK: Record<TaskRowState, { bg: string; border: string; dot: string }> = {
  done: { bg: flowColor.alphaGreen300_60, border: "transparent", dot: flowColor.green700 },
  review: { bg: flowColor.alphaGreen300_60, border: "transparent", dot: flowColor.green700 },
  active: { bg: flowColor.neutral0, border: flowColor.orange500, dot: flowColor.orange500 },
  late: { bg: flowColor.neutral0, border: "transparent", dot: flowColor.rec },
  todo: { bg: flowColor.neutral0, border: "transparent", dot: flowColor.neutral0 },
};

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <Box aria-hidden sx={{ width: 22, height: 22, flexShrink: 0, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${checked ? flowColor.green700 : flowColor.neutral300}`, bgcolor: checked ? flowColor.green700 : flowColor.neutral0 }}>
      {checked ? <CheckIcon sx={{ fontSize: 16, color: flowColor.neutral0 }} /> : null}
    </Box>
  );
}

/** Colonne horaire : l'heure, un point, le trait vers la tâche suivante. */
function TimeRail({ time, state, last }: { time: string; state: TaskRowState; last: boolean }) {
  const look = ROW_LOOK[state];
  return (
    <Box sx={{ width: 44, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", pt: "8px" }}>
      <Typography sx={{ ...flowText.caption, color: state === "active" ? flowColor.orange500 : flowColor.neutral900, whiteSpace: "nowrap" }}>{time}</Typography>
      <Box sx={{ width: 10, height: 10, mt: "4px", borderRadius: "50%", border: `1.5px solid ${state === "todo" ? flowColor.neutral900 : look.dot}`, bgcolor: look.dot }} />
      {last ? null : <Box sx={{ flex: 1, width: 2, minHeight: 18, bgcolor: flowColor.neutral900, opacity: 0.6, mt: "2px" }} />}
    </Box>
  );
}

function TaskRow({ task, shownDay, last, onOpen }: { task: TaskOccurrence; shownDay: string; last: boolean; onOpen: (task: TaskOccurrence) => void }) {
  const state = taskRowState(task);
  const look = ROW_LOOK[state];
  return (
    <Box sx={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
      <TimeRail time={taskRowTime(task.due_at, shownDay)} state={state} last={last} />
      <ButtonBase
        data-testid={`tasks-row-${task.id}`}
        data-state={state}
        onClick={() => onOpen(task)}
        sx={{ flex: 1, minWidth: 0, my: "4px", minHeight: 56, px: "12px", gap: "10px", justifyContent: "flex-start", textAlign: "right", borderRadius: `${flowRadius.md}px`, bgcolor: look.bg, border: `1px solid ${look.border}` }}
      >
        <CheckBox checked={isRowChecked(state)} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ ...flowText.button, color: flowColor.neutral900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</Typography>
          <Typography sx={{ ...flowText.caption, color: state === "late" ? flowColor.rec : flowColor.alphaNeutral900_60 }}>{taskRowSubtitle(task)}</Typography>
        </Box>
        <ChevronLeftIcon sx={{ color: flowColor.neutral900, fontSize: 20 }} />
      </ButtonBase>
    </Box>
  );
}

function PeriodHeader({ group, open, onToggle }: { group: PeriodGroup; open: boolean; onToggle: () => void }) {
  const look = PERIOD_LOOK[group.period];
  return (
    <ButtonBase
      aria-expanded={open}
      aria-label={open ? he.managerTasksCollapse : he.managerTasksExpand}
      onClick={onToggle}
      sx={{ width: "100%", px: "16px", pt: "12px", pb: open ? "22px" : "12px", gap: "10px", justifyContent: "flex-start", bgcolor: look.bg, color: look.text }}
    >
      <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: flowColor.neutral0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <look.Icon sx={{ fontSize: 20, color: flowColor.neutral900 }} />
      </Box>
      <Box sx={{ flex: 1, textAlign: "right" }}>
        <Typography component="h2" sx={{ ...flowText.button, fontSize: 16 }}>{he.managerTasksPeriodTitles[group.period]}</Typography>
        <Typography sx={{ ...flowText.caption, opacity: 0.85 }} dir="ltr" textAlign="right">{he.managerTasksPeriodHours[group.period]}</Typography>
      </Box>
      <Typography data-testid={`tasks-count-${group.period}`} sx={{ ...flowText.label, px: "10px", py: "2px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.alphaNeutral0_70, color: flowColor.neutral900 }} dir="ltr">
        {`${group.done}/${group.total}`}
      </Typography>
      {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
    </ButtonBase>
  );
}

function PeriodSection({ group, shownDay, onOpen }: { group: PeriodGroup; shownDay: string; onOpen: (task: TaskOccurrence) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Box data-testid={`tasks-period-${group.period}`} sx={{ borderRadius: `${flowRadius.xl2}px`, overflow: "hidden", bgcolor: PERIOD_LOOK[group.period].bg }}>
      <PeriodHeader group={group} open={open} onToggle={() => setOpen((v) => !v)} />
      {open ? (
        <Box sx={{ mt: "-12px", px: "12px", py: "10px", borderRadius: `${flowRadius.xl2}px`, bgcolor: flowColor.neutral0 }}>
          {group.tasks.map((task, index) => (
            <TaskRow key={task.id} task={task} shownDay={shownDay} last={index === group.tasks.length - 1} onOpen={onOpen} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

type Props = { groups: PeriodGroup[]; shownDay: string; emptyText: string; onOpen: (task: TaskOccurrence) => void };

/** Le jour en trois blocs (Figma « משימות › היום »). */
export default function ManagerTasksDayBoard({ groups, shownDay, emptyText, onOpen }: Props) {
  if (!groups.length) {
    return <Typography data-testid="tasks-empty" sx={{ ...flowText.body, textAlign: "center", color: flowColor.alphaNeutral900_60, py: 6 }}>{emptyText}</Typography>;
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {groups.map((group) => <PeriodSection key={group.period} group={group} shownDay={shownDay} onOpen={onOpen} />)}
    </Box>
  );
}
