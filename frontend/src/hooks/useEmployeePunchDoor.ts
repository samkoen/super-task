import { useMemo } from "react";
import {
  findOpenPunchTask,
  hasOpenWorkTasks,
  shouldShowEndDoor,
  type HandedOverIds,
  type PunchTask,
} from "../utils/punchDoor";

/** `handedOver` : tâches finies sur ce téléphone dont les vidéos attendent la קליטה (comptent comme faites). */
export function useEmployeePunchDoor<T extends PunchTask>(tasks: T[], inTask: boolean, handedOver?: HandedOverIds) {
  const start = useMemo(() => findOpenPunchTask(tasks, "start", handedOver), [tasks, handedOver]);
  const end = useMemo(() => findOpenPunchTask(tasks, "end", handedOver), [tasks, handedOver]);
  const hasOpenWork = useMemo(() => hasOpenWorkTasks(tasks, handedOver), [tasks, handedOver]);
  const showStart = Boolean(start);
  const showEnd = shouldShowEndDoor({
    startOpen: showStart,
    end,
    inTask,
    hasOpenWork,
  });

  return { start, end, showStart, showEnd };
}
