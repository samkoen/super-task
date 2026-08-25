import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ViewAsEmployeeDialog from "./ViewAsEmployeeDialog";
import { he } from "../../i18n/he";
import { userService } from "../../services/userService";

const mocks = vi.hoisted(() => ({
  viewAs: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ viewAs: mocks.viewAs }),
}));

vi.mock("../../services/userService", () => ({
  userService: {
    listTeam: vi.fn(),
  },
}));

describe("ViewAsEmployeeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.listTeam).mockResolvedValue([
      {
        id: "e1",
        full_name: "דני עובד",
        email: "050123",
        is_active: true,
        branch_name: "סניף א",
      } as never,
      {
        id: "e2",
        full_name: "מוסתר",
        email: "x",
        is_active: false,
      } as never,
    ]);
  });

  it("lists active employees and starts view-as", async () => {
    mocks.viewAs.mockResolvedValue(undefined);
    render(<ViewAsEmployeeDialog open onClose={() => {}} />);
    expect(await screen.findByText("דני עובד")).toBeTruthy();
    expect(screen.queryByText("מוסתר")).toBeNull();
    fireEvent.click(screen.getByText("דני עובד"));
    await waitFor(() => {
      expect(mocks.viewAs).toHaveBeenCalledWith("e1");
    });
  });

  it("shows empty state when no active employees", async () => {
    vi.mocked(userService.listTeam).mockResolvedValue([]);
    render(<ViewAsEmployeeDialog open onClose={() => {}} />);
    expect(await screen.findByText(he.viewAsNoEmployees)).toBeTruthy();
  });
});
