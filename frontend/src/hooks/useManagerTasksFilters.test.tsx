import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useManagerTasksFilters } from "./useManagerTasksFilters";

function Probe({ canPickBranch }: { canPickBranch: boolean }) {
  const { filters } = useManagerTasksFilters(canPickBranch);
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="branch">{filters.branch}</span>
      <button onClick={() => navigate("/manager/tasks")}>network</button>
      <button onClick={() => navigate("/manager/tasks?branch=b2")}>b2</button>
    </>
  );
}

function renderProbe(path: string, canPickBranch = true) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Probe canPickBranch={canPickBranch} />
    </MemoryRouter>,
  );
}

const branch = () => screen.getByTestId("branch").textContent;

describe("useManagerTasksFilters — snif suivi dans l'adresse", () => {
  it("follows the header scope, including back to the whole network with no other param", () => {
    renderProbe("/manager/tasks?branch=b1");
    expect(branch()).toBe("b1");
    fireEvent.click(screen.getByText("b2"));
    expect(branch()).toBe("b2");
    fireEvent.click(screen.getByText("network"));
    expect(branch()).toBe("");
  });

  it("ignores branch changes for a manager who cannot pick a snif", () => {
    renderProbe("/manager/tasks", false);
    fireEvent.click(screen.getByText("b2"));
    expect(branch()).toBe("");
  });
});
