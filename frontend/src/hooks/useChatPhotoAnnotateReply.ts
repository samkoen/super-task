import { useRef, useState } from "react";

export function useChatPhotoAnnotateReply(
  sendPhoto: (file: File, caption?: string) => void | Promise<void>,
) {
  const sendRef = useRef(sendPhoto);
  sendRef.current = sendPhoto;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  return {
    photoUrl,
    start: (url: string) => setPhotoUrl(url),
    close: () => setPhotoUrl(null),
    submit: async (file: File, caption?: string) => {
      await sendRef.current(file, caption);
      setPhotoUrl(null);
    },
  };
}
