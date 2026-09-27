import { useEffect, useState } from "react";

/** Tarayıcı online durumu + isteğe bağlı dış sinyal (Firestore fromCache vb.) */
export function useConnectionStatus(forcedOffline = false) {
  const [browserOffline, setBrowserOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline = () => setBrowserOffline(false);
    const onOffline = () => setBrowserOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return browserOffline || forcedOffline;
}
