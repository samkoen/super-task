import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CaptureActionButtons from "./CaptureActionButtons";
import { he } from "../../i18n/he";

function state(overrides = {}) {
  return { show: false, added: false, disabled: false, onClick: vi.fn(), ...overrides };
}

describe("CaptureActionButtons", () => {
  it("only renders the kinds that are shown", () => {
    render(
      <CaptureActionButtons
        uploadingKind={null}
        prominent={false}
        photo={state({ show: true })}
        video={state()}
        audio={state()}
      />,
    );
    expect(screen.getByRole("button", { name: he.addPhoto })).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.addVideo })).toBeNull();
  });

  it("uses custom labels and switches to the done label once added", () => {
    const { rerender } = render(
      <CaptureActionButtons
        uploadingKind={null}
        prominent
        photo={state({ show: true, label: "צלם תמונה", doneLabel: "צלם שוב" })}
        video={state()}
        audio={state()}
      />,
    );
    expect(screen.getByRole("button", { name: "צלם תמונה" })).toBeTruthy();
    rerender(
      <CaptureActionButtons
        uploadingKind={null}
        prominent
        photo={state({ show: true, added: true, label: "צלם תמונה", doneLabel: "צלם שוב" })}
        video={state()}
        audio={state()}
      />,
    );
    expect(screen.getByRole("button", { name: "צלם שוב" })).toBeTruthy();
  });

  it("makes the first capture a filled big button and the retake an outlined one", () => {
    const { rerender } = render(
      <CaptureActionButtons uploadingKind={null} prominent photo={state({ show: true })} video={state()} audio={state()} />,
    );
    expect(screen.getByRole("button").className).toContain("MuiButton-contained");
    rerender(
      <CaptureActionButtons
        uploadingKind={null}
        prominent
        photo={state({ show: true, added: true })}
        video={state()}
        audio={state()}
      />,
    );
    expect(screen.getByRole("button").className).toContain("MuiButton-outlined");
  });

  it("keeps optional additions quiet (outlined) even when nothing was added yet", () => {
    render(
      <CaptureActionButtons uploadingKind={null} prominent quiet photo={state({ show: true })} video={state()} audio={state()} />,
    );
    expect(screen.getByRole("button").className).toContain("MuiButton-outlined");
  });

  it("shows a loading label for the kind that is uploading and forwards clicks", () => {
    const onClick = vi.fn();
    render(
      <CaptureActionButtons
        uploadingKind="video"
        prominent={false}
        photo={state({ show: true, onClick })}
        video={state({ show: true })}
        audio={state()}
      />,
    );
    expect(screen.getByRole("button", { name: he.loading })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.addPhoto }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables a kind that the device cannot capture", () => {
    render(
      <CaptureActionButtons
        uploadingKind={null}
        prominent
        photo={state()}
        video={state()}
        audio={state({ show: true, disabled: true })}
      />,
    );
    expect((screen.getByRole("button", { name: he.addAudio }) as HTMLButtonElement).disabled).toBe(true);
  });
});
