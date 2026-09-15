import { useCallback, useEffect, useRef, useState } from "react";
import { peekChatMediaPreview } from "../utils/chatMediaPreview";
import { fetchMediaBlobWithRetry } from "../utils/fetchMediaBlob";
import { mediaUrl } from "../utils/mediaUrl";

type MediaSetter<T> = (value: T) => void;

export function useResolvedMediaSrc(path: string | null | undefined, eager = false) {
  const preview = peekChatMediaPreview(path);
  const [retrySrc, setRetrySrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const retryRef = useRef({ src: null as string | null, busy: false });
  const aliveRef = useRef(true);

  const setRetrySrcSafe = useCallback<MediaSetter<string | null>>((value) => {
    if (aliveRef.current) setRetrySrc(value);
  }, []);

  const setFailedSafe = useCallback<MediaSetter<boolean>>((value) => {
    if (aliveRef.current) setFailed(value);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    retryRef.current = { src: null, busy: false };
    setRetrySrc(null);
    setFailed(false);
  }, [path]);

  useEffect(() => () => revokeIfBlob(retrySrc), [retrySrc]);

  useEffect(() => {
    if (!eager || !path || preview || path.startsWith("blob:")) return;
    startProxyRetry(path, preview, retryRef, setRetrySrcSafe, setFailedSafe);
  }, [path, eager, preview, setRetrySrcSafe, setFailedSafe]);

  const onError = useCallback(() => {
    startProxyRetry(path, preview, retryRef, setRetrySrcSafe, setFailedSafe);
  }, [path, preview, setRetrySrcSafe, setFailedSafe]);

  return {
    src: resolvedMediaSrc(path, preview, retrySrc, eager, failed),
    loading: isEagerLoading(path, preview, retrySrc, eager, failed),
    failed,
    onError,
  };
}

function isEagerLoading(
  path: string | null | undefined,
  preview: string | null,
  retrySrc: string | null,
  eager: boolean,
  failed: boolean,
): boolean {
  if (!eager || !path || preview || retrySrc || failed || path.startsWith("blob:")) return false;
  return true;
}

function resolvedMediaSrc(
  path: string | null | undefined,
  preview: string | null,
  retrySrc: string | null,
  eager: boolean,
  failed: boolean,
): string | null {
  if (preview) return preview;
  if (path?.startsWith("blob:")) return path;
  if (retrySrc) return retrySrc;
  if (eager && !failed) return null;
  return mediaUrl(path);
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
  setRetrySrc: MediaSetter<string | null>,
  setFailed: MediaSetter<boolean>,
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
