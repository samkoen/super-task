const STORAGE_KEY = "super.apkUpdate.launched";

export function launchedApkUpdateName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function markApkUpdateLaunched(versionName: string): void {
  const name = versionName.trim();
  if (!name) return;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* quota / mode privé */
  }
}

export function shouldBlockApkUpdate(latestName: string, launchedName: string): boolean {
  return Boolean(latestName.trim()) && launchedName.trim() !== latestName.trim();
}
