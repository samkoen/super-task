import { he } from "../i18n/he";
import type { DirectChatCard, DirectChatInbox } from "../services/directChatService";

export type DirectChatScope = "branch" | "network";

export function employeeManagerCards(inbox: Pick<DirectChatInbox, "managers">): DirectChatCard[] {
  return inbox.managers ?? [];
}

export function needsEmployeeManagerPicker(managers: DirectChatCard[]): boolean {
  return managers.length > 1;
}

export function employeeOpenMineScope(managers: DirectChatCard[]): DirectChatScope | undefined {
  if (managers.length !== 1) return undefined;
  return managers[0].scope === "network" ? "network" : managers[0].scope === "branch" ? "branch" : undefined;
}

export function employeeManagerLabel(card: Pick<DirectChatCard, "scope">): string {
  return card.scope === "network" ? he.roleNetworkManager : he.directChatManagerTitle;
}
