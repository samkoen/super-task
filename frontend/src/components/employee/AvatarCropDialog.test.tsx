import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import AvatarCropDialog from "./AvatarCropDialog";
import { he } from "../../i18n/he";
import { theme } from "../../theme/theme";

describe("AvatarCropDialog", () => {
  it("shows a circular framing hint", () => {
    URL.createObjectURL = vi.fn(() => "blob:avatar");
    URL.revokeObjectURL = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <AvatarCropDialog
          open
          file={new File(["x"], "face.jpg", { type: "image/jpeg" })}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText(he.avatarCropTitle)).toBeTruthy();
    expect(screen.getByText(he.avatarCropHint)).toBeTruthy();
    expect(screen.getByRole("slider", { name: he.avatarCropZoom })).toBeTruthy();
  });
});
