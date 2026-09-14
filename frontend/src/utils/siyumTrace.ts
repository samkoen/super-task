/** Traces siyum — visibles dans la console Chrome, pour croiser avec les logs Vercel. */

export function siyumTrace(step: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(`[siyum] ${step}`, detail);
    return;
  }
  console.info(`[siyum] ${step}`);
}
