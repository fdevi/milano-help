import { useState, useEffect, useCallback } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone || sessionStorage.getItem("pwa-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIos && !isSafari) {
      // Not in Safari — can't install
    } else if (isIos) {
      setShowIos(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroid(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = () => {
    setDismissed(true);
    setShowAndroid(false);
    setShowIos(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  if (dismissed || (!showAndroid && !showIos)) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Chiudi"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Installa Milano Help</p>
            {showAndroid && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Accedi più velocemente dalla schermata Home del tuo telefono.
                </p>
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="mt-3 w-full"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Installa app
                </Button>
              </>
            )}
            {showIos && (
              <div className="text-xs text-muted-foreground mt-1 space-y-1.5">
                <p>Per installare l'app su iPhone/iPad:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li className="flex items-center gap-1">
                    Premi <Share className="w-3.5 h-3.5 inline text-primary" /> <strong>Condividi</strong>
                  </li>
                  <li className="flex items-center gap-1">
                    Scorri e seleziona <Plus className="w-3.5 h-3.5 inline text-primary" /> <strong>Aggiungi alla schermata Home</strong>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
