/** Place the launcher inside the top MUI modal so a task dialog does not steal the click. */
export function pickSystemBugPortalHost(root: ParentNode): HTMLElement {
  const modals = root.querySelectorAll(".MuiModal-root");
  for (let i = modals.length - 1; i >= 0; i -= 1) {
    const el = modals[i] as HTMLElement;
    if (el.hasAttribute("data-system-bug-dialog")) continue;
    if (el.querySelector("[data-system-bug-dialog]")) continue;
    return el;
  }
  return root as HTMLElement;
}
