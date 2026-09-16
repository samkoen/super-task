import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../services/api";
import { appReleaseService, type AppReleaseLatest } from "../services/appReleaseService";
import { resolveApiBaseUrl } from "../services/apiBaseUrl";
import {
  canInstallApkPackages,
  canUseApkUpdate,
  downloadAndInstallApk,
  getInstalledAppInfo,
  isApkInstallPermissionError,
  openApkInstallPermissionSettings,
} from "../plugins/apkUpdate";
import { hasNewerAppRelease, resolveApkDownloadUrl } from "../utils/appRelease";
import { launchedApkUpdateName, markApkUpdateLaunched, shouldBlockApkUpdate } from "../utils/apkUpdateMemory";
import { he } from "../i18n/he";

export type InstalledAppInfo = { versionCode: number; versionName: string };

export function useAppUpdate() {
  const enabled = canUseApkUpdate();
  const [installed, setInstalled] = useState<InstalledAppInfo | null>(null);
  const [latest, setLatest] = useState<AppReleaseLatest | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const [launchedName, setLaunchedName] = useState(launchedApkUpdateName);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const loaded = await loadInstalledAndLatest();
      setInstalled(loaded.info);
      setLatest(loaded.remote);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, refresh]);

  const downloadLatest = useCallback(async () => {
    setDownloading(true);
    setMessage("");
    try {
      const remote = await fetchLatestRelease();
      setLatest(remote);
      await installFromUrl(remote.download_url);
      markApkUpdateLaunched(remote.version_name);
      setLaunchedName(remote.version_name);
    } catch (error) {
      setMessage(installErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  }, []);

  const newer = hasNewerAppRelease(installed, latest);
  return {
    enabled,
    installed,
    latest,
    loading,
    downloading,
    message,
    updateAvailable: newer,
    blockingUpdate: newer && shouldBlockApkUpdate(latest?.version_name || "", launchedName),
    refresh,
    downloadLatest,
  };
}

async function loadInstalledAndLatest() {
  const [info, remote] = await Promise.all([getInstalledAppInfo(), appReleaseService.latest()]);
  return { info, remote };
}

async function fetchLatestRelease(): Promise<AppReleaseLatest & { download_url: string; version_name: string }> {
  const remote = await appReleaseService.latest();
  if (!remote.available || !remote.download_url || !remote.version_name) {
    throw new Error(he.appUpdateFailed);
  }
  return { ...remote, download_url: remote.download_url, version_name: remote.version_name };
}

async function installFromUrl(downloadUrl: string): Promise<void> {
  if (!(await canInstallApkPackages())) {
    await openApkInstallPermissionSettings();
    throw new Error("need-permission");
  }
  const url = resolveApkDownloadUrl(downloadUrl, resolveApiBaseUrl());
  await downloadAndInstallApk(url);
}

function installErrorMessage(error: unknown): string {
  if (isApkInstallPermissionError(error) || (error instanceof Error && error.message === "need-permission")) {
    return he.appUpdatePermission;
  }
  return error instanceof ApiError ? error.message : he.appUpdateFailed;
}
