import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReloadWhenUploadsLand } from "./useReloadWhenUploadsLand";

function setup(initial: string[]) {
  const reload = vi.fn();
  const view = renderHook(({ ids }) => useReloadWhenUploadsLand(ids, reload), {
    initialProps: { ids: new Set(initial) as ReadonlySet<string> },
  });
  const next = (ids: string[]) => view.rerender({ ids: new Set(ids) });
  return { reload, next };
}

describe("useReloadWhenUploadsLand", () => {
  it("does not reload on mount", () => {
    expect(setup(["a"]).reload).not.toHaveBeenCalled();
  });

  it("reloads once a task's files have all left the phone", () => {
    const { reload, next } = setup(["a", "b"]);
    next(["b"]);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload when a task only joins the queue, or when the set is rebuilt unchanged", () => {
    const { reload, next } = setup(["a"]);
    next(["a"]);
    next(["a", "b"]);
    expect(reload).not.toHaveBeenCalled();
  });
});
