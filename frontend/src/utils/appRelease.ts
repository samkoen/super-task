const VERSION_NAME = /^(\d+)\.(\d+)$/;

export function versionCodeFromName(name: string): number {
  const match = VERSION_NAME.exec(name.trim());
  if (!match) return 0;
  return Number(match[1]) * 100 + Number(match[2]);
}

export function nextVersionName(name: string): string {
  const match = VERSION_NAME.exec(name.trim());
  if (!match) return "1.1";
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (minor >= 99) return `${major + 1}.0`;
  return `${major}.${minor + 1}`;
}

export function isNewerAppRelease(installedCode: number, latestCode: number): boolean {
  return latestCode > installedCode;
}

export function isNewerAppVersion(installedName: string, latestName: string): boolean {
  const installed = versionCodeFromName(installedName);
  const latest = versionCodeFromName(latestName);
  if (installed > 0 && latest > 0) return latest > installed;
  return false;
}

export function resolveApkDownloadUrl(downloadUrl: string, apiBaseUrl: string): string {
  const trimmed = downloadUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = apiBaseUrl.replace(/\/api\/?$/, "");
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  return `${origin}/${trimmed}`;
}
