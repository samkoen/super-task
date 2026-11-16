import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FlowBottomNav from "./FlowBottomNav";
import { he } from "../../i18n/he";

describe("FlowBottomNav", () => {
  it("shows the four Figma icons in order, home being the active one", () => {
    render(<FlowBottomNav onHome={vi.fn()} onChat={vi.fn()} onDocs={vi.fn()} onTeam={vi.fn()} />);
    const ids = Array.from(screen.getByTestId("flow-bottom-nav").querySelectorAll("button")).map((b) => b.getAttribute("data-testid"));
    expect(ids).toEqual(["flow-nav-docs", "flow-nav-team", "flow-nav-chat", "flow-nav-home"]);
    expect(screen.getByLabelText(he.flowNavHome).getAttribute("aria-current")).toBe("page");
    expect(screen.getByLabelText(he.flowNavDocs).querySelector("img")?.getAttribute("src")).toContain("nav-docs");
  });

  it("calls home and chat handlers", () => {
    const onHome = vi.fn();
    const onChat = vi.fn();
    render(<FlowBottomNav onHome={onHome} onChat={onChat} />);
    fireEvent.click(screen.getByTestId("flow-nav-home"));
    fireEvent.click(screen.getByTestId("flow-nav-chat"));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it("keeps docs and team visible but inert when they have no destination", () => {
    render(<FlowBottomNav onHome={vi.fn()} onChat={vi.fn()} />);
    expect((screen.getByTestId("flow-nav-docs") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("flow-nav-team") as HTMLButtonElement).disabled).toBe(true);
  });
});
