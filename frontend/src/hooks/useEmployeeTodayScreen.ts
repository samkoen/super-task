import { useEffect, useSyncExternalStore } from "react";
import {
  getEmployeeTodayScreen,
  setEmployeeTodayScreen,
  subscribeEmployeeTodayScreen,
} from "../utils/employeeTodayScreenStore";

/** Lecture (Layout) : true tant que l'écran 01 « המשימות להיום » est affiché. */
export function useEmployeeTodayScreen(): boolean {
  return useSyncExternalStore(subscribeEmployeeTodayScreen, getEmployeeTodayScreen, () => false);
}

/** Publication (page oved) : remis à false au démontage. */
export function usePublishEmployeeTodayScreen(shown: boolean): void {
  useEffect(() => {
    setEmployeeTodayScreen(shown);
    return () => setEmployeeTodayScreen(false);
  }, [shown]);
}
