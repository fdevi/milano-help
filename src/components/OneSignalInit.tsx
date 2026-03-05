import { useEffect } from "react";

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string;

const OneSignalInit = () => {
  useEffect(() => {
    if (!ONESIGNAL_APP_ID) return;

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => {
      const w = window as any;
      w.OneSignalDeferred = w.OneSignalDeferred || [];
      w.OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          notifyButton: { enable: true },
        });
        w.oneSignalReady = true;
        console.log("[OneSignal] SDK inizializzato e pronto");
      });
    };
    script.onerror = () => {
      console.error("[OneSignal] Errore nel caricamento dell'SDK");
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
};

export default OneSignalInit;
