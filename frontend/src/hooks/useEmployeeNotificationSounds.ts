import { useEffect } from "react";
import { NOTIFICATION_EVENT, type TaskChangeDetail } from "../constants/events";
import {
  bindNotificationAudioUnlock,
  playNotificationSound,
  soundKindFromNotificationKind,
  type NotificationSoundKind,
} from "../utils/notificationSounds";

/** Joue les sons d'alerte uniquement pour le rôle employé. */
export function useEmployeeNotificationSounds(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const unbind = bindNotificationAudioUnlock();

    const onNotify = (ev: Event) => {
      const detail = (ev as CustomEvent<TaskChangeDetail>).detail;
      const fromPayload = detail?.sound as NotificationSoundKind | undefined;
      const kind =
        fromPayload && fromPayload !== "none"
          ? fromPayload
          : soundKindFromNotificationKind(detail?.kind);
      playNotificationSound(kind);
    };

    window.addEventListener(NOTIFICATION_EVENT, onNotify);
    return () => {
      unbind();
      window.removeEventListener(NOTIFICATION_EVENT, onNotify);
    };
  }, [enabled]);
}
