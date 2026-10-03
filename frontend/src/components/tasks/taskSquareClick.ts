import type { KeyboardEvent } from "react";

/** Tout le carré ouvre la tâche. Un contrôle imbriqué (zoom) ne remonte pas. */
export function taskSquareClickProps(label: string, onOpen: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: onOpen,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onOpen();
    },
  };
}
