import { Capacitor } from "@capacitor/core";
import { he } from "../i18n/he";
import { notificationIdToLocalId } from "./taskChatAlert";

const CHANNEL_ID = "task-chat";

type LocalNotificationsApi = {
  requestPermissions: () => Promise<{ display: string }>;
  createChannel: (channel: {
    id: string;
    name: string;
    importance: number;
    visibility: number;
    sound: string;
    vibration: boolean;
  }) => Promise<void>;
  schedule: (opts: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      extra?: Record<string, string | null>;
      channelId?: string;
    }>;
  }) => Promise<unknown>;
  addListener: (
    event: "localNotificationActionPerformed",
    cb: (ev: { notification: { extra?: { occurrenceId?: string; kind?: string } } }) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
};

async function loadPlugin(): Promise<LocalNotificationsApi | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications as LocalNotificationsApi;
  } catch {
    return null;
  }
}

export async function ensureChatNotifyReady(): Promise<boolean> {
  const plugin = await loadPlugin();
  if (!plugin) return false;
  try {
    const perm = await plugin.requestPermissions();
    if (perm.display !== "granted") return false;
    await plugin.createChannel({
      id: CHANNEL_ID,
      name: he.taskChatAlertChannel,
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function showNativeChatBanner(input: {
  id: string;
  title: string;
  body: string;
  occurrenceId: string | null;
  kind: string;
}): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.schedule({
      notifications: [
        {
          id: notificationIdToLocalId(input.id),
          title: input.title,
          body: input.body,
          extra: { occurrenceId: input.occurrenceId, kind: input.kind },
          channelId: CHANNEL_ID,
        },
      ],
    });
  } catch {
    /* plugin absent or denied */
  }
}

export function listenNativeChatBannerTap(
  onTap: (extra: { occurrenceId?: string; kind?: string }) => void,
): () => void {
  let remove: (() => void) | undefined;
  void loadPlugin().then((plugin) => {
    if (!plugin) return;
    void plugin.addListener("localNotificationActionPerformed", (ev) => {
      onTap(ev.notification.extra ?? {});
    }).then((handle) => {
      remove = () => {
        void handle.remove();
      };
    });
  });
  return () => remove?.();
}
