import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "./authService";
import api from "./api";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockPost = api.post as ReturnType<typeof vi.fn>;
const mockPatch = api.patch as ReturnType<typeof vi.fn>;

describe("authService profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateProfile patches /auth/me", async () => {
    mockPatch.mockResolvedValue({
      data: { message: "ok", user: { id: "1", first_name: "A" } },
    });
    await authService.updateProfile({
      first_name: "A",
      last_name: "B",
      email: "a@test.com",
      phone: "050",
    });
    expect(mockPatch).toHaveBeenCalledWith("/auth/me", {
      first_name: "A",
      last_name: "B",
      email: "a@test.com",
      phone: "050",
    });
  });

  it("changePassword posts current and new", async () => {
    mockPost.mockResolvedValue({ data: { message: "ok" } });
    await authService.changePassword("old", "newpass");
    expect(mockPost).toHaveBeenCalledWith("/auth/change-password", {
      current_password: "old",
      new_password: "newpass",
    });
  });
});
