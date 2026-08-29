import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NOTIFICATION_EVENT } from "../constants/events";
import { notificationService, type AppNotification } from "../services/notificationService";
import { loadSeenAlertIds, rememberAlertIds } from "../utils/seenChatAlerts";
import { isNativeApp } from "../utils/isNativeApp";
import { taskIdFromSearch } from "../utils/notificationNavigation";
import { playNotificationSound, soundKindFromNotificationKind } from "../utils/notificationSounds";
import {
  ensureChatNotifyReady,
  listenNativeChatBannerTap,
  showNativeChatBanner,
} from "../utils/nativeLocalNotifications";
import {
  isTaskChatAlertKind,
  shouldShowTaskChatBanner,
  taskChatAlertPath,
} from "../utils/taskChatAlert";
import type { ChatAlertBannerState } from "../components/notifications/ChatAlertBanner";

const POLL_MS = 12_000;

export function useNativeTaskChatAlerts(opts: {
  enabled: boolean;
  onBreak: boolean;
  role?: string;
}): { banner: ChatAlertBannerState; dismiss: () => void; open: () => void } {
  const navigate = useNavigate();
  const location = useLocation();
  const [banner, setBanner] = useState<ChatAlertBannerState>(null);
  const targetRef = useRef<{ kind: string; occurrenceId: string } | null>(null);
  const viewingRef = useRef<string | null>(null);
  const onBreakRef = useRef(opts.onBreak);
  const roleRef = useRef(opts.role);
  viewingRef.current = taskIdFromSearch(location.search);
  onBreakRef.current = opts.onBreak;
  roleRef.current = opts.role;

  useEffect(() => {
    if (!opts.enabled || !isNativeApp()) return;
    return startNativeChatAlertPoll({
      onBreakRef,
      viewingRef,
      roleRef,
      setBanner,
      targetRef,
      navigate,
    });
  }, [opts.enabled, navigate]);

  return {
    banner,
    dismiss: () => setBanner(null),
    open: () => {
      const target = targetRef.current;
      setBanner(null);
      if (target) navigate(taskChatAlertPath(target.kind, roleRef.current, target.occurrenceId));
    },
  };
}

function startNativeChatAlertPoll(ctx: {
  onBreakRef: { current: boolean };
  viewingRef: { current: string | null };
  roleRef: { current: string | undefined };
  setBanner: (next: ChatAlertBannerState) => void;
  targetRef: { current: { kind: string; occurrenceId: string } | null };
  navigate: (path: string) => void;
}): () => void {
  const seen = loadSeenAlertIds();
  let cancelled = false;
  let primed = false;
  void ensureChatNotifyReady();

  const tick = async () => {
    try {
      const data = await notificationService.list(true);
      if (cancelled) return;
      if (!primed) {
        primeSeenChatAlerts(data.items, seen);
        primed = true;
        return;
      }
      deliverNewChatAlerts(data.items, seen, {
        onBreak: ctx.onBreakRef.current,
        viewingOccurrenceId: ctx.viewingRef.current,
        setBanner: ctx.setBanner,
        targetRef: ctx.targetRef,
      });
    } catch {
      /* ignore poll errors */
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), POLL_MS);
  const unlisten = listenNativeChatBannerTap((extra) => {
    if (!extra.occurrenceId) return;
    ctx.navigate(taskChatAlertPath(extra.kind || "task_message_manager", ctx.roleRef.current, extra.occurrenceId));
  });
  return () => {
    cancelled = true;
    clearInterval(timer);
    unlisten();
  };
}

export function primeSeenChatAlerts(items: AppNotification[], seen: Set<string>): void {
  const ids = items.filter((item) => isTaskChatAlertKind(item.kind)).map((item) => item.id);
  ids.forEach((id) => seen.add(id));
  rememberAlertIds(ids);
}

export function deliverNewChatAlerts(
  items: AppNotification[],
  seen: Set<string>,
  ctx: {
    onBreak: boolean;
    viewingOccurrenceId: string | null;
    setBanner: (next: ChatAlertBannerState) => void;
    targetRef: { current: { kind: string; occurrenceId: string } | null };
  },
) {
  for (const item of items) {
    if (!isTaskChatAlertKind(item.kind) || seen.has(item.id)) continue;
    seen.add(item.id);
    rememberAlertIds([item.id]);
    if (!shouldShowTaskChatBanner({
      kind: item.kind,
      onBreak: ctx.onBreak,
      occurrenceId: item.occurrence_id,
      viewingOccurrenceId: ctx.viewingOccurrenceId,
    })) continue;
    announceChatAlert(item, ctx);
  }
}

function announceChatAlert(
  item: AppNotification,
  ctx: {
    setBanner: (next: ChatAlertBannerState) => void;
    targetRef: { current: { kind: string; occurrenceId: string } | null };
  },
) {
  ctx.targetRef.current = item.occurrence_id
    ? { kind: item.kind, occurrenceId: item.occurrence_id }
    : null;
  ctx.setBanner({ title: item.title, message: item.message });
  void showNativeChatBanner({
    id: item.id,
    title: item.title,
    body: item.message,
    occurrenceId: item.occurrence_id,
    kind: item.kind,
  });
  playNotificationSound(soundKindFromNotificationKind(item.kind));
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT, { detail: { kind: item.kind, sound: "none" } }),
  );
}
