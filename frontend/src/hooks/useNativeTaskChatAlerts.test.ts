import { describe, expect, it, vi } from "vitest";
import { deliverNewChatAlerts, primeSeenChatAlerts } from "./useNativeTaskChatAlerts";
import type { AppNotification } from "../services/notificationService";
import { playNotificationSound } from "../utils/notificationSounds";
import { showNativeChatBanner } from "../utils/nativeLocalNotifications";

vi.mock("../utils/nativeLocalNotifications", () => ({
  ensureChatNotifyReady: vi.fn(),
  showNativeChatBanner: vi.fn(),
  listenNativeChatBannerTap: () => () => undefined,
}));

vi.mock("../utils/notificationSounds", () => ({
  playNotificationSound: vi.fn(),
  soundKindFromNotificationKind: () => "manager_question",
}));

function note(id: string, kind = "task_message_manager"): AppNotification {
  return {
    id,
    user_id: "u1",
    kind,
    title: "תשובת מנהל",
    message: "בדוק את המדף",
    occurrence_id: "occ-1",
    issue_report_id: null,
    branch_id: "b1",
    read_at: null,
    created_at: "2026-08-29T10:00:00+03:00",
  };
}

describe("deliverNewChatAlerts", () => {
  it("primes existing unread without ringing", () => {
    sessionStorage.clear();
    const seen = new Set<string>();
    primeSeenChatAlerts([note("old")], seen);
    const setBanner = vi.fn();
    deliverNewChatAlerts([note("old")], seen, {
      onBreak: false,
      viewingOccurrenceId: null,
      setBanner,
      targetRef: { current: null },
    });
    expect(setBanner).not.toHaveBeenCalled();
    expect(playNotificationSound).not.toHaveBeenCalled();
  });

  it("rings and shows a banner for a new task chat", () => {
    sessionStorage.clear();
    const seen = new Set<string>(["old"]);
    const setBanner = vi.fn();
    deliverNewChatAlerts([note("new")], seen, {
      onBreak: false,
      viewingOccurrenceId: null,
      setBanner,
      targetRef: { current: null },
    });
    expect(setBanner).toHaveBeenCalledWith({
      title: "תשובת מנהל",
      message: "בדוק את המדף",
    });
    expect(playNotificationSound).toHaveBeenCalledWith("manager_question");
    expect(showNativeChatBanner).toHaveBeenCalled();
  });
});
