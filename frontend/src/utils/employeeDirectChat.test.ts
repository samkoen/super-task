import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";
import {
  employeeManagerCards,
  employeeManagerLabel,
  employeeOpenMineScope,
  employeeSurfaceChatState,
  needsEmployeeManagerPicker,
} from "./employeeDirectChat";

function card(overrides: Partial<DirectChatCard> = {}): DirectChatCard {
  return {
    id: "c1",
    kind: "up",
    scope: "branch",
    counterpart_user_id: "m1",
    counterpart_name: "מנהל",
    counterpart_role: "branch_manager",
    last_preview: null,
    last_at: null,
    unread_count: 0,
    ...overrides,
  };
}

describe("employeeDirectChat", () => {
  it("opens the single manager thread without a picker", () => {
    const networkOnly = [card({ scope: "network", counterpart_role: "network_manager" })];
    expect(needsEmployeeManagerPicker(networkOnly)).toBe(false);
    expect(employeeOpenMineScope(networkOnly)).toBe("network");
    expect(employeeManagerLabel(networkOnly[0])).toBe(he.roleNetworkManager);
  });

  it("asks which manager when both the snif and the network are available", () => {
    const both = [
      card(),
      card({ id: "c2", scope: "network", counterpart_user_id: "nm", counterpart_role: "network_manager" }),
    ];
    expect(employeeManagerCards({ managers: both })).toHaveLength(2);
    expect(needsEmployeeManagerPicker(both)).toBe(true);
    expect(employeeOpenMineScope(both)).toBeUndefined();
    expect(employeeManagerLabel(both[0])).toBe(he.directChatManagerTitle);
  });

  it("uses only the upward thread on the oved screen for a dual-hat menahel", () => {
    const inbox = {
      items: [card({ kind: "down", counterpart_user_id: "e1", unread_count: 4 })],
      up: card({
        id: "up1",
        scope: "network",
        counterpart_user_id: "nm",
        counterpart_role: "network_manager",
        unread_count: 1,
      }),
      unread_count: 5,
      managers: [],
    };
    const surface = employeeSurfaceChatState(inbox, "branch_manager");
    expect(surface.unread).toBe(1);
    expect(surface.managers).toHaveLength(1);
    expect(surface.managers[0].scope).toBe("network");
    expect(employeeSurfaceChatState(inbox, "employee").unread).toBe(5);
  });
});
