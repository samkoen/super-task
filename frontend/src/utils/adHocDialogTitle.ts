/** Titre dialog משימה מזדמנת : pour menahel snif, affiche le nom du snif à côté. */
export function adHocDialogTitle(
  baseTitle: string,
  branchName: string | null | undefined,
  options: { showBranchBesideTitle: boolean },
): string {
  const name = (branchName || "").trim();
  if (!options.showBranchBesideTitle || !name) return baseTitle;
  return `${baseTitle} · ${name}`;
}
