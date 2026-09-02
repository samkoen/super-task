import { useEffect, useMemo, useState } from "react";
import { useDueReached } from "./useDueReached";
import { findOpenPunchTask, shouldShowEndDoor, type PunchTask } from "../utils/punchDoor";

export function useEmployeePunchDoor<T extends PunchTask>(tasks: T[], inTask: boolean) {
  const start = useMemo(() => findOpenPunchTask(tasks, "start"), [tasks]);
  const end = useMemo(() => findOpenPunchTask(tasks, "end"), [tasks]);
  const due = useDueReached(start ? null : end?.due_at);
  const [requested, setRequested] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (due) setDismissed(false);
    if (!end) {
      setRequested(false);
      setDismissed(false);
    }
  }, [due, end]);

  const showStart = Boolean(start);
  const showEnd = shouldShowEndDoor({
    startOpen: showStart,
    end,
    inTask,
    due,
    requested,
    dismissed,
  });

  return {
    start,
    end,
    showStart,
    showEnd,
    requestEnd: () => {
      setDismissed(false);
      setRequested(true);
    },
    dismissEnd: () => {
      setRequested(false);
      setDismissed(true);
    },
  };
}
