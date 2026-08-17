import { describe, expect, it, vi, beforeEach } from "vitest";
import { reportService } from "./reportService";
import api from "./api";

vi.mock("./api", () => ({
  default: { get: vi.fn() },
}));

const mockGet = api.get as ReturnType<typeof vi.fn>;

describe("reportService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("teamEmployees calls /reports/employees with params", async () => {
    mockGet.mockResolvedValue({ data: { employees: [] } });
    await reportService.teamEmployees({ branch_id: "b1", period: "7d" });
    expect(mockGet).toHaveBeenCalledWith("/reports/employees", {
      params: { branch_id: "b1", period: "7d" },
    });
  });
});
