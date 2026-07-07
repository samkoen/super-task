import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("./api", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

import { userService } from "./userService";

describe("userService team employee methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeamEmployee posts to /users/team", async () => {
    mockPost.mockResolvedValue({
      data: { message: "ok", user: { id: "1", email: "a@b.com" } },
    });

    const payload = {
      email: "a@b.com",
      password: "123456",
      first_name: "A",
      last_name: "B",
      job_function: "head_cashier",
    };
    const result = await userService.createTeamEmployee(payload);

    expect(mockPost).toHaveBeenCalledWith("/users/team", payload);
    expect(result.user.id).toBe("1");
  });

  it("updateTeamEmployee patches user by id", async () => {
    mockPatch.mockResolvedValue({
      data: { message: "updated", user: { id: "2" } },
    });

    await userService.updateTeamEmployee("2", {
      email: "x@y.com",
      first_name: "X",
      last_name: "Y",
      job_function: "stockers",
    });

    expect(mockPatch).toHaveBeenCalledWith("/users/team/2", {
      email: "x@y.com",
      first_name: "X",
      last_name: "Y",
      job_function: "stockers",
    });
  });

  it("deactivateTeamEmployee deletes user by id", async () => {
    mockDelete.mockResolvedValue({
      data: { message: "deactivated", user: { id: "3" } },
    });

    await userService.deactivateTeamEmployee("3");

    expect(mockDelete).toHaveBeenCalledWith("/users/team/3");
  });

  it("setTeamEmployeeAccess patches access status", async () => {
    mockPatch.mockResolvedValue({
      data: { message: "granted", user: { id: "4", is_active: true } },
    });

    await userService.setTeamEmployeeAccess("4", true);

    expect(mockPatch).toHaveBeenCalledWith("/users/team/4/access", { is_active: true });
  });

  it("resetTeamEmployeePassword posts new password", async () => {
    mockPost.mockResolvedValue({
      data: { message: "reset", user: { id: "5" } },
    });

    await userService.resetTeamEmployeePassword("5", "newpass123");

    expect(mockPost).toHaveBeenCalledWith("/users/team/5/reset-password", {
      password: "newpass123",
    });
  });
});
