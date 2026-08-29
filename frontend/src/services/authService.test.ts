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
      preferred_language: "th",
    });
    expect(mockPatch).toHaveBeenCalledWith("/auth/me", {
      first_name: "A",
      last_name: "B",
      email: "a@test.com",
      phone: "050",
      preferred_language: "th",
    });
  });

  it("viewAs posts employee id", async () => {
    mockPost.mockResolvedValue({ data: { user: { id: "e1", is_preview: true } } });
    await authService.viewAs("e1");
    expect(mockPost).toHaveBeenCalledWith("/auth/view-as", { user_id: "e1" });
  });

  it("exitViewAs posts exit endpoint", async () => {
    mockPost.mockResolvedValue({ data: { user: { id: "m1", is_preview: false } } });
    await authService.exitViewAs();
    expect(mockPost).toHaveBeenCalledWith("/auth/exit-view-as");
  });

  it("changePassword posts current and new", async () => {
    mockPost.mockResolvedValue({ data: { message: "ok" } });
    await authService.changePassword("old", "newpass");
    expect(mockPost).toHaveBeenCalledWith("/auth/change-password", {
      current_password: "old",
      new_password: "newpass",
    });
  });

  it("uploadAvatar posts the photo to /auth/me/avatar", async () => {
    const file = new File(["x"], "face.jpg", { type: "image/jpeg" });
    mockPost.mockResolvedValue({
      data: { message: "ok", user: { id: "1" }, url: "/uploads/avatars/a.jpg" },
    });
    await authService.uploadAvatar(file);
    expect(mockPost).toHaveBeenCalledTimes(1);
    const [path, body] = mockPost.mock.calls[0];
    expect(path).toBe("/auth/me/avatar");
    expect(body).toBeInstanceOf(FormData);
  });

  it("stylizeAvatar posts the photo to /auth/me/avatar/excellence", async () => {
    const file = new File(["x"], "face.jpg", { type: "image/jpeg" });
    mockPost.mockResolvedValue({
      data: {
        message: "ok",
        user: { id: "1", excellence_slogan: "מצוינות כל יום" },
        url: "/uploads/avatars/a.jpg",
        used_ai: true,
      },
    });
    await authService.stylizeAvatar(file);
    expect(mockPost).toHaveBeenCalledTimes(1);
    const [path, body, config] = mockPost.mock.calls[0];
    expect(path).toBe("/auth/me/avatar/excellence");
    expect(body).toBeInstanceOf(FormData);
    expect(config).toEqual({ timeout: 120_000 });
  });
});
