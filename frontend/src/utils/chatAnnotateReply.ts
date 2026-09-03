export function canAnnotateChatReply(composeEnabled: boolean, mine: boolean): boolean {
  return composeEnabled && !mine;
}
