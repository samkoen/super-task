import { describe, expect, it, vi } from "vitest";
import { closeModal, resolveAndroidBackAction, topOpenModal } from "./androidBack";

const base = { hasOpenModal: false, pathname: "/employee/chats", homePath: "/employee", canGoBack: true };

describe("resolveAndroidBackAction", () => {
  it("closes an open window before anything else", () => {
    expect(resolveAndroidBackAction({ ...base, hasOpenModal: true, pathname: "/employee" })).toBe("closeOverlay");
  });

  it("goes back to the previous page", () => {
    expect(resolveAndroidBackAction(base)).toBe("navigateBack");
  });

  it("returns to the home page when there is no history", () => {
    expect(resolveAndroidBackAction({ ...base, canGoBack: false })).toBe("goHome");
  });

  it("leaves the app from the home page or the login page", () => {
    expect(resolveAndroidBackAction({ ...base, pathname: "/employee/" })).toBe("leaveApp");
    expect(resolveAndroidBackAction({ ...base, pathname: "/login", homePath: null })).toBe("leaveApp");
  });
});

describe("topOpenModal / closeModal", () => {
  it("picks the last open modal and sends it Escape", () => {
    document.body.innerHTML =
      '<div class="MuiModal-root" id="a"></div><div class="MuiModal-root MuiModal-hidden" id="b"></div><div class="MuiModal-root" id="c"></div>';
    const top = topOpenModal();
    expect(top?.id).toBe("c");
    const onKey = vi.fn((e: KeyboardEvent) => e.key);
    top!.addEventListener("keydown", onKey);
    closeModal(top!);
    expect(onKey).toHaveReturnedWith("Escape");
  });

  it("returns null when nothing is open", () => {
    document.body.innerHTML = '<div class="MuiModal-root MuiModal-hidden"></div>';
    expect(topOpenModal()).toBeNull();
  });
});
