import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppUpdateDialog from "./AppUpdateDialog";
import { he } from "../../i18n/he";

const onDownload = vi.fn();
const onLater = vi.fn();

describe("AppUpdateDialog", () => {
  it("does not render the dialog when closed", () => {
    render(
      <AppUpdateDialog
        open={false}
        currentName="1.1"
        latestName="1.2"
        downloading={false}
        message=""
        onDownload={onDownload}
        onLater={onLater}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("calls download from the primary button", () => {
    render(
      <AppUpdateDialog
        open
        currentName="1.1"
        latestName="1.2"
        downloading={false}
        message=""
        onDownload={onDownload}
        onLater={onLater}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.appUpdateDownload }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
