import { useEffect, useRef, useState } from "react";
import { peekChatMediaPreview } from "../utils/chatMediaPreview";
import { fetchMediaBlobWithRetry } from "../utils/fetchMediaBlob";
import { mediaUrl } from "../utils/mediaUrl";

export function useResolvedMediaSrc(path: string | null | undefined, eager = false) {
  const preview = peekChatMediaPreview(path);
  const [retrySrc, setRetrySrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const retryRef = useRef({ src: null as string | null, busy: false });

  useEffect(() => {
    retryRef.current = { src: null, busy: false };
    setRetrySrc(null);
    setFailed(false);
  }, [path]);

  useEffect(() => () => revokeIfBlob(retrySrc), [retrySrc]);

  useEffect(() => {
    if (!eager || !path || preview || path.startsWith("blob:")) return;
    startProxyRetry(path, preview, retryRef, setRetrySrc, setFailed);
  }, [path, eager, preview]);

  return {
    src: resolvedMediaSrc(path, preview, retrySrc, eager),
    loading: retryRef.current.busy && !retrySrc && !preview,
    failed,
    onError: () => startProxyRetry(path, preview, retryRef, setRetrySrc, setFailed),
  };
}

function resolvedMediaSrc(
  path: string | null | undefined,
  preview: string | null,
  retrySrc: string | null,
  eager: boolean,
): string | null {
  if (preview) return preview;
  if (path?.startsWith("blob:")) return path;
  if (retrySrc) return retrySrc;
  return eager ? null : mediaUrl(path);
}

function revokeIfBlob(src: string | null) {
  if (!src?.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(src);
  } catch {
    /* ignore */
  }
}

function startProxyRetry(
  path: string | null | undefined,
  preview: string | null,
  retryRef: { current: { src: string | null; busy: boolean } },
  setRetrySrc: (src: string | null) => void,
  setFailed: (value: boolean) => void,
) {
  if (retryRef.current.busy) return;
  if (!path || preview || retryRef.current.src || path.startsWith("blob:")) {
    setFailed(true);
    return;
  }
  retryRef.current.busy = true;
  setFailed(false);
  void fetchMediaBlobWithRetry(path)
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      retryRef.current.src = objectUrl;
      setRetrySrc(objectUrl);
    })
    .catch(() => {
      retryRef.current.src = null;
      setFailed(true);
    })
    .finally(() => {
      retryRef.current.busy = false;
    });
}
