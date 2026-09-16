import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppUpdateCard from "./AppUpdateCard";
import { he } from "../../i18n/he";

const downloadLatest = vi.fn();

vi.mock("../../hooks/useAppUpdate", () => ({
  useAppUpdate: () => mockState(),
}));

let mockState: () => object = () => ({ enabled: false });

describe("AppUpdateCard", () => {
  it("hides the card on web", () => {
    mockState = () => ({ enabled: false });
    const { container } = render(<AppUpdateCard />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the download button when a newer APK exists", () => {
    mockState = () => ({
      enabled: true,
      installed: { versionCode: 2, versionName: "1.1" },
      latest: { available: true, version_code: 3, version_name: "1.2" },
      loading: false,
      downloading: false,
      message: "",
      updateAvailable: true,
      downloadLatest,
    });
    render(<AppUpdateCard />);
    expect(screen.getByRole("button", { name: he.appUpdateDownload })).toBeTruthy();
  });

  it("shows the up-to-date label when already current", () => {
    mockState = () => ({
      enabled: true,
      installed: { versionCode: 3, versionName: "1.2" },
      latest: { available: true, version_code: 3, version_name: "1.2" },
      loading: false,
      downloading: false,
      message: "",
      updateAvailable: false,
      downloadLatest,
    });
    render(<AppUpdateCard />);
    expect(screen.getByText(he.appUpdateUpToDate)).toBeTruthy();
  });
});
