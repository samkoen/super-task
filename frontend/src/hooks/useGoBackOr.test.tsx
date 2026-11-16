import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { hasInAppPrevious, useGoBackOr } from "./useGoBackOr";

function Studio() {
  const back = useGoBackOr("/manager/tasks");
  return <button onClick={back}>back</button>;
}

function Home() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/manager/tasks/new")}>open</button>;
}

function renderAt(entries: string[]) {
  render(
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route path="/manager" element={<><p>home</p><Home /></>} />
        <Route path="/manager/tasks" element={<p>list</p>} />
        <Route path="/manager/tasks/new" element={<Studio />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("hasInAppPrevious", () => {
  it("is false on the first history entry", () => {
    expect(hasInAppPrevious("default")).toBe(false);
    expect(hasInAppPrevious(undefined)).toBe(false);
  });

  it("is true after an in-app navigation", () => {
    expect(hasInAppPrevious("a1b2c3")).toBe(true);
  });
});

describe("useGoBackOr", () => {
  it("returns to the page the studio was opened from", () => {
    renderAt(["/manager"]);
    fireEvent.click(screen.getByText("open"));
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByText("home")).toBeTruthy();
  });

  it("falls back to the list when the studio was opened directly", () => {
    renderAt(["/manager/tasks/new"]);
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByText("list")).toBeTruthy();
  });
});
