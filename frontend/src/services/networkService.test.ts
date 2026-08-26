import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock("./api", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { networkService } from "./networkService";

describe("networkService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the manages-all-workers flag", async () => {
    mockPatch.mockResolvedValue({
      data: { message: "ok", network: { id: "n1", name: "רשת", is_active: true, manages_all_workers: true } },
    });
    const res = await networkService.update("n1", { manages_all_workers: true });
    expect(mockPatch).toHaveBeenCalledWith("/networks/n1", { manages_all_workers: true });
    expect(res.network.manages_all_workers).toBe(true);
  });
});
