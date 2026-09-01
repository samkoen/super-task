import { describe, expect, it } from "vitest";
import { ROUTE_TRAIL_MAX, pushRouteTrail } from "./routeTrail";

describe("routeTrail", () => {
  it("appends a new screen and skips duplicates", () => {
    expect(pushRouteTrail("/employee", [])).toEqual(["/employee"]);
    expect(pushRouteTrail("/employee", ["/employee"])).toEqual(["/employee"]);
    expect(pushRouteTrail("/employee/account", ["/employee"])).toEqual([
      "/employee",
      "/employee/account",
    ]);
  });

  it("keeps only the last screens", () => {
    const previous = Array.from({ length: ROUTE_TRAIL_MAX }, (_, i) => `/p${i}`);
    const next = pushRouteTrail("/new", previous);
    expect(next).toHaveLength(ROUTE_TRAIL_MAX);
    expect(next[next.length - 1]).toBe("/new");
    expect(next[0]).toBe("/p1");
  });
});
