import { useState } from "react";
import { useAppUpdate } from "../../hooks/useAppUpdate";
import AppUpdateBanner from "./AppUpdateBanner";
import AppUpdateDialog from "./AppUpdateDialog";

export default function AppUpdateGuard() {
  const update = useAppUpdate();
  const [postponed, setPostponed] = useState(false);
  const latestName = update.latest?.version_name;
  if (!update.enabled || !update.blockingUpdate || !latestName) return null;
  const shared = {
    latestName,
    downloading: update.downloading,
    message: update.message,
    onDownload: () => void update.downloadLatest(),
  };

  if (postponed) return <AppUpdateBanner {...shared} />;
  return (
    <AppUpdateDialog
      {...shared}
      open
      currentName={update.installed?.versionName || "—"}
      onLater={() => setPostponed(true)}
    />
  );
}
