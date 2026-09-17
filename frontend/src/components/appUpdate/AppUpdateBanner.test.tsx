import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppUpdateBanner from "./AppUpdateBanner";
import { he } from "../../i18n/he";
import { fillVersionPlaceholders } from "../../utils/appRelease";

describe("AppUpdateBanner", () => {
  it("shows the new version and the download action", () => {
    const onDownload = vi.fn();
    render(
      <AppUpdateBanner latestName="1.2" downloading={false} message="" onDownload={onDownload} />,
    );
    expect(screen.getByText(fillVersionPlaceholders(he.appUpdateBanner, "1.2"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.appUpdateDownload }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("shows an install error on the banner", () => {
    render(
      <AppUpdateBanner
        latestName="1.2"
        downloading={false}
        message={he.appUpdateFailed}
        onDownload={() => undefined}
      />,
    );
    expect(screen.getByText(he.appUpdateFailed)).toBeTruthy();
  });
});
