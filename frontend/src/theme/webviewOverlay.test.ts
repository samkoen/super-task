import { describe, expect, it } from "vitest";
import { theme } from "./theme";
import { webviewOverlayDefaultProps } from "./webviewOverlay";

describe("webviewOverlay", () => {
  it("turns off the MUI focus trap on every dialog, drawer and menu", () => {
    expect(webviewOverlayDefaultProps.disableEnforceFocus).toBe(true);
    expect(webviewOverlayDefaultProps.disableAutoFocus).toBe(true);
    expect(webviewOverlayDefaultProps.disableRestoreFocus).toBe(true);
    expect(theme.components?.MuiDialog?.defaultProps).toMatchObject(webviewOverlayDefaultProps);
    expect(theme.components?.MuiDrawer?.defaultProps).toMatchObject(webviewOverlayDefaultProps);
    expect(theme.components?.MuiMenu?.defaultProps).toMatchObject(webviewOverlayDefaultProps);
  });

  it("keeps dialog actions above the Android nav bar", () => {
    const actions = theme.components?.MuiDialogActions?.styleOverrides;
    const root = actions && typeof actions === "object" && "root" in actions ? actions.root : null;
    expect(root).toMatchObject({ flexShrink: 0 });
    expect(JSON.stringify(root)).toContain("safe-area-inset-bottom");
  });
});
