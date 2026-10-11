import { useMemo } from "react";
import {
  findOpenPunchTask,
  hasOpenWorkTasks,
  shouldShowEndDoor,
  type PunchTask,
} from "../utils/punchDoor";

export function useEmployeePunchDoor<T extends PunchTask>(tasks: T[], inTask: boolean) {
  const start = useMemo(() => findOpenPunchTask(tasks, "start"), [tasks]);
  const end = useMemo(() => findOpenPunchTask(tasks, "end"), [tasks]);
  const hasOpenWork = useMemo(() => hasOpenWorkTasks(tasks), [tasks]);
  const showStart = Boolean(start);
  const showEnd = shouldShowEndDoor({
    startOpen: showStart,
    end,
    inTask,
    hasOpenWork,
  });

  return { start, end, showStart, showEnd };
}
