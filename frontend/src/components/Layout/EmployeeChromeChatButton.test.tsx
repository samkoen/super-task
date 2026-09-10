import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeChromeChatButton from "./EmployeeChromeChatButton";
import { he } from "../../i18n/he";

const navigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "employee" } }),
}));

vi.mock("../../hooks/useEmployeeChatUnread", () => ({
  useEmployeeChatUnread: () => 2,
}));

describe("EmployeeChromeChatButton", () => {
  it("opens the oved chats from the sticky header", () => {
    render(<EmployeeChromeChatButton />);
    fireEvent.click(screen.getByRole("button", { name: he.directChatOpen }));
    expect(navigate).toHaveBeenCalledWith("/employee/chats");
  });
});
