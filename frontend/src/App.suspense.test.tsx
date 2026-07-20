import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("App suspense scope", () => {
  it("does not wrap Layout in a top-level Suspense (keeps menu mounted)", () => {
    const src = readFileSync(resolve(__dirname, "App.tsx"), "utf8");
    // Ancien bug : <Suspense> autour de tout <Routes> → FAB/menu disparaît au lazy-load
    expect(src).not.toMatch(/return\s*\(\s*<Suspense[\s\S]*<Routes/);
    expect(src).toContain("LazyPage");
    expect(src).toContain("<Layout />");
  });
});
