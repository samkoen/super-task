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

export function hasNewerAppRelease(
  installed: { versionCode: number; versionName: string } | null,
  latest: { available?: boolean; version_name?: string; version_code?: number } | null,
): boolean {
  if (!installed || !latest?.available || !latest.version_name) return false;
  if (installed.versionName.trim() === latest.version_name.trim()) return false;
  const remoteCode = Number(latest.version_code);
  const localCode = Number(installed.versionCode);
  if (remoteCode > 0 && localCode > 0 && remoteCode <= localCode) return false;
  return isNewerAppVersion(installed.versionName, latest.version_name);
}

export function fillVersionPlaceholders(
  template: string,
  latest: string,
  current = "",
): string {
  return template.replaceAll("{latest}", latest).replaceAll("{current}", current);
}

export function resolveApkDownloadUrl(downloadUrl: string, apiBaseUrl: string): string {
  const trimmed = downloadUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = apiBaseUrl.replace(/\/api\/?$/, "");
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  return `${origin}/${trimmed}`;
}
