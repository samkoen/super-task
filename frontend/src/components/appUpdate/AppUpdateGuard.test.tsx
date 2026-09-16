import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppUpdateGuard from "./AppUpdateGuard";
import { he } from "../../i18n/he";
import { fillVersionPlaceholders } from "../../utils/appRelease";

const downloadLatest = vi.fn();

vi.mock("../../hooks/useAppUpdate", () => ({
  useAppUpdate: () => mockState(),
}));

let mockState: () => object = () => ({ enabled: false });

function availableState() {
  return {
    enabled: true,
    installed: { versionCode: 101, versionName: "1.1" },
    latest: { available: true, version_code: 102, version_name: "1.2" },
    loading: false,
    downloading: false,
    message: "",
    updateAvailable: true,
    blockingUpdate: true,
    downloadLatest,
  };
}

describe("AppUpdateGuard", () => {
  it("hides when there is no update", () => {
    mockState = () => ({ enabled: true, updateAvailable: false, blockingUpdate: false, latest: null });
    const { container } = render(<AppUpdateGuard />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a blocking warning with the new version", () => {
    mockState = availableState;
    render(<AppUpdateGuard />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(he.appUpdateRequiredTitle)).toBeTruthy();
    expect(
      screen.getByText(fillVersionPlaceholders(he.appUpdateRequiredBody, "1.2", "1.1")),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: he.appUpdateDownload })).toBeTruthy();
  });

  it("keeps a visible banner after postpone", () => {
    mockState = availableState;
    render(<AppUpdateGuard />);
    fireEvent.click(screen.getByRole("button", { name: he.appUpdateLater }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(fillVersionPlaceholders(he.appUpdateBanner, "1.2")),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: he.appUpdateDownload })).toBeTruthy();
  });

  it("hides when the install for that version was already launched", () => {
    mockState = () => ({
      ...availableState(),
      blockingUpdate: false,
    });
    const { container } = render(<AppUpdateGuard />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
