import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { useBranchQueryWriter } from "./useManagerScopeState";
import { readManagerScopeBranchId, wasManagerScopeChosen } from "../utils/managerScopeBranch";

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={["/manager"]}>{children}</MemoryRouter>;

beforeEach(() => sessionStorage.clear());

describe("useBranchQueryWriter", () => {
  it("marks a choice made by the manager", () => {
    const { result } = renderHook(() => useBranchQueryWriter(), { wrapper });
    act(() => result.current("b1"));
    expect(readManagerScopeBranchId()).toBe("b1");
    expect(wasManagerScopeChosen()).toBe(true);
  });

  it("does not mark the automatic landing on the home snif", () => {
    const { result } = renderHook(() => useBranchQueryWriter(), { wrapper });
    act(() => result.current("b1", { explicit: false }));
    expect(readManagerScopeBranchId()).toBe("b1");
    expect(wasManagerScopeChosen()).toBe(false);
  });
});
