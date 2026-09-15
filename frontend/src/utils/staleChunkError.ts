/** Vite / React.lazy : chunk périmé après re-optimize des deps. */
export function isStaleChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Outdated Optimize Dep") ||
    msg.includes("Importing a module script failed")
  );
}
