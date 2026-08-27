import { describe, expect, it } from "vitest";
import { mergeNewerMessages, mergeOlderMessages } from "./chatPage";

const m = (id: string) => ({ id });

describe("chatPage merge", () => {
  it("prepends older messages without duplicates", () => {
    expect(mergeOlderMessages([m("b"), m("c")], [m("a"), m("b")])).toEqual([m("a"), m("b"), m("c")]);
  });

  it("appends only unseen newer messages", () => {
    expect(mergeNewerMessages([m("a"), m("b")], [m("b"), m("c")])).toEqual([m("a"), m("b"), m("c")]);
  });

  it("keeps the loaded list when the latest page is already known", () => {
    const loaded = [m("a"), m("b")];
    expect(mergeNewerMessages(loaded, [m("a"), m("b")])).toEqual(loaded);
  });
});
