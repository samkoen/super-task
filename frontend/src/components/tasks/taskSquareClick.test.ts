import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { taskSquareClickProps } from "./taskSquareClick";

describe("taskSquareClickProps", () => {
  it("opens on Enter and Space from the square itself", () => {
    const onOpen = vi.fn();
    const props = taskSquareClickProps("ouvrir", onOpen);
    const node = document.createElement("div");
    const preventDefault = vi.fn();
    props.onKeyDown({
      key: "Enter",
      target: node,
      currentTarget: node,
      preventDefault,
    } as unknown as KeyboardEvent<HTMLElement>);
    props.onKeyDown({
      key: " ",
      target: node,
      currentTarget: node,
      preventDefault,
    } as unknown as KeyboardEvent<HTMLElement>);
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it("ignores other keys and keys from a nested control", () => {
    const onOpen = vi.fn();
    const props = taskSquareClickProps("ouvrir", onOpen);
    const node = document.createElement("div");
    const child = document.createElement("button");
    props.onKeyDown({
      key: "Enter",
      target: child,
      currentTarget: node,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent<HTMLElement>);
    props.onKeyDown({
      key: "Tab",
      target: node,
      currentTarget: node,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent<HTMLElement>);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
