import { useEffect, useRef, useState } from "react";
import { peekChatMediaPreview } from "../utils/chatMediaPreview";
import { fetchMediaBlobWithRetry } from "../utils/fetchMediaBlob";
import { mediaUrl } from "../utils/mediaUrl";

export function useResolvedMediaSrc(path: string | null | undefined) {
  const preview = peekChatMediaPreview(path);
  const [retrySrc, setRetrySrc] = useState<string | null>(null);
  const retryRef = useRef({ src: null as string | null, busy: false });

  useEffect(() => {
    retryRef.current = { src: null, busy: false };
    setRetrySrc(null);
  }, [path]);

  useEffect(() => () => revokeIfBlob(retrySrc), [retrySrc]);

  return {
    src: preview || retrySrc || mediaUrl(path),
    loading: retryRef.current.busy && !retrySrc && !preview,
    onError: () => startProxyRetry(path, preview, retryRef, setRetrySrc),
  };
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
) {
  if (!path || preview || retryRef.current.src || retryRef.current.busy || path.startsWith("blob:")) {
    return;
  }
  retryRef.current.busy = true;
  void fetchMediaBlobWithRetry(path)
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      retryRef.current.src = objectUrl;
      setRetrySrc(objectUrl);
    })
    .catch(() => {
      retryRef.current.src = null;
    })
    .finally(() => {
      retryRef.current.busy = false;
    });
}
