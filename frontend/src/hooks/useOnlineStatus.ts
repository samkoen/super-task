import { useEffect, useState } from "react";

function readOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

/** Le téléphone a-t-il du réseau ? Suit les événements « online » / « offline » du WebView. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(readOnline);
  useEffect(() => {
    const update = () => setOnline(readOnline());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
