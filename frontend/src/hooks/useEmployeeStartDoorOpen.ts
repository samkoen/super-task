import { useEffect, useSyncExternalStore } from "react";
import {
  getEmployeeStartDoorOpen,
  setEmployeeStartDoorOpen,
  subscribeEmployeeStartDoor,
} from "../utils/employeeStartDoorStore";

/** Lecture : true tant que l'écran d'ouverture de משמרת est affiché. */
export function useEmployeeStartDoorOpen(): boolean {
  return useSyncExternalStore(subscribeEmployeeStartDoor, getEmployeeStartDoorOpen, () => false);
}

/** Publication (page oved) : remis à false au démontage. */
export function usePublishEmployeeStartDoor(open: boolean): void {
  useEffect(() => {
    setEmployeeStartDoorOpen(open);
    return () => setEmployeeStartDoorOpen(false);
  }, [open]);
}
