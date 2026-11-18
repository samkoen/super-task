import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReloadWhenUploadsLand } from "./useReloadWhenUploadsLand";

function setup(initial: string[], reload = vi.fn(() => Promise.resolve())) {
  const view = renderHook(({ ids }) => useReloadWhenUploadsLand(ids, reload), {
    initialProps: { ids: new Set(initial) as ReadonlySet<string> },
  });
  const next = (ids: string[]) => view.rerender({ ids: new Set(ids) });
  return { reload, next, view };
}

describe("useReloadWhenUploadsLand", () => {
  it("does not reload on mount, and passes the queue through", () => {
    const { reload, view } = setup(["a"]);
    expect(reload).not.toHaveBeenCalled();
    expect([...view.result.current]).toEqual(["a"]);
  });

  it("reloads once a task's files have all left the phone", async () => {
    const { reload, next } = setup(["a", "b"]);
    await act(async () => next(["b"]));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload when a task only joins the queue, or when the set is rebuilt unchanged", async () => {
    const { reload, next } = setup(["a"]);
    await act(async () => next(["a"]));
    await act(async () => next(["a", "b"]));
    expect(reload).not.toHaveBeenCalled();
  });

  it("keeps a task that just left the queue as waiting until the reload is done (no door flash)", async () => {
    let finish!: () => void;
    const reload = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { next, view } = setup(["a"], reload);
    await act(async () => next([]));
    expect(view.result.current.has("a")).toBe(true);
    await act(async () => finish());
    expect(view.result.current.has("a")).toBe(false);
  });

  it("lets the task go even when the reload fails", async () => {
    const reload = vi.fn(() => Promise.reject(new Error("offline")));
    const { next, view } = setup(["a"], reload);
    await act(async () => next([]));
    expect(view.result.current.has("a")).toBe(false);
  });
});
