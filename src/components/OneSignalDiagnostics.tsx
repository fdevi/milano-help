import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, RefreshCw, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiagResult {
  oneSignalReady: boolean;
  externalId: string | null;
  onesignalId: string | null;
  playerId: string | null;
  token: string | null;
  notificationPermission: string;
  badgeApiSetSupported: boolean;
  badgeApiClearSupported: boolean;
  oneSignalInitError: string | null;
  serviceWorkers: { scriptURL: string; state: string; scope: string }[];
  oneSignalSWFound: boolean;
  oneSignalUserDefined: boolean;
  oneSignalLoggedIn: boolean;
  errors: string[];
}

export default function OneSignalDiagnostics() {
  const [result, setResult] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const nav = navigator as any;
    console.log("[Badge API] supporto rilevato", {
      setAppBadge: typeof nav.setAppBadge === "function",
      clearAppBadge: typeof nav.clearAppBadge === "function",
    });
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const diag: DiagResult = {
      oneSignalReady: false,
      externalId: null,
      onesignalId: null,
      playerId: null,
      token: null,
      notificationPermission: "unknown",
      badgeApiSetSupported: false,
      badgeApiClearSupported: false,
      oneSignalInitError: null,
      serviceWorkers: [],
      oneSignalSWFound: false,
      oneSignalUserDefined: false,
      oneSignalLoggedIn: false,
      errors: [],
    };

    // Wait 2s for subscription to settle
    await new Promise(r => setTimeout(r, 2000));

    try {
      const w = window as any;
      const nav = navigator as any;
      diag.oneSignalReady = !!w.oneSignalReady;
      diag.notificationPermission = typeof Notification !== "undefined" ? Notification.permission : "not supported";
      diag.badgeApiSetSupported = typeof nav.setAppBadge === "function";
      diag.badgeApiClearSupported = typeof nav.clearAppBadge === "function";
      diag.oneSignalInitError = typeof w.oneSignalInitError === "string" ? w.oneSignalInitError : null;

      console.log("[Badge API] supporto rilevato", {
        setAppBadge: diag.badgeApiSetSupported,
        clearAppBadge: diag.badgeApiClearSupported,
      });

      // OneSignal data
      try {
        diag.oneSignalUserDefined = !!w.OneSignal?.User;
        if (w.OneSignal?.User) {
          // Use property access instead of method call
          try { diag.externalId = w.OneSignal.User.externalId ?? null; } catch (e: any) { diag.errors.push("externalId: " + e.message); }
          try { diag.onesignalId = w.OneSignal.User.onesignalId ?? null; } catch (e: any) { diag.errors.push("onesignalId: " + e.message); }
          try {
            const sub = w.OneSignal.User.PushSubscription;
            if (sub) {
              diag.playerId = sub.id ?? null;
              diag.token = sub.token ?? null;
            }
          } catch (e: any) { diag.errors.push("PushSubscription: " + e.message); }
          // Check if logged in (externalId present = logged in)
          diag.oneSignalLoggedIn = !!diag.externalId;
        } else {
          diag.errors.push("OneSignal.User non disponibile");
        }
      } catch (e: any) { diag.errors.push("OneSignal access: " + e.message); }

      // Service workers
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          diag.serviceWorkers = regs.map(r => ({
            scriptURL: r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "unknown",
            state: r.active?.state || r.installing?.state || r.waiting?.state || "unknown",
            scope: r.scope,
          }));
          diag.oneSignalSWFound = regs.some(r =>
            (r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "").includes("OneSignal")
          );

          console.log("[SW] registrazioni attive", diag.serviceWorkers);
        } else {
          diag.errors.push("Service Worker non supportato dal browser");
        }
      } catch (e: any) { diag.errors.push("SW check: " + e.message); }

    } catch (e: any) {
      diag.errors.push("Errore generale: " + e.message);
    }

    setResult(diag);
    setLoading(false);
  };

  const regenerateSW = async () => {
    setRegenerating(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if ((reg.active?.scriptURL || "").includes("OneSignal")) {
            await reg.unregister();
          }
        }
        await navigator.serviceWorker.register("/OneSignalSDKWorker.js", { scope: "/" });
        toast({ title: "Service Worker rigenerato", description: "Ricarica la pagina per completare." });
      }
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    }
    setRegenerating(false);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copiato!", description: "Report copiato negli appunti." });
    });
  };

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" /> Diagnostica Notifiche Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={runDiagnostics} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
            Diagnostica
          </Button>
          <Button size="sm" variant="outline" onClick={regenerateSW} disabled={regenerating} className="gap-1.5">
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Rigenera SW
          </Button>
          {result && (
            <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-1.5">
              <Copy className="w-4 h-4" /> Copia report
            </Button>
          )}
        </div>

        {result && (
          <div className="rounded-md bg-muted p-3 text-xs font-mono space-y-2 overflow-x-auto">
            <Row label="oneSignalReady" value={result.oneSignalReady ? "✅ true" : "❌ false"} ok={result.oneSignalReady} />
            <Row label="Permission" value={result.notificationPermission} ok={result.notificationPermission === "granted"} />
            <Row label="Badge API setAppBadge" value={result.badgeApiSetSupported ? "✅ supportata" : "❌ non supportata"} ok={result.badgeApiSetSupported} />
            <Row label="Badge API clearAppBadge" value={result.badgeApiClearSupported ? "✅ supportata" : "❌ non supportata"} ok={result.badgeApiClearSupported} />
            <Row label="OneSignal init error" value={result.oneSignalInitError || "—"} ok={!result.oneSignalInitError} />
            <Row label="User definito" value={result.oneSignalUserDefined ? "✅ sì" : "❌ no"} ok={result.oneSignalUserDefined} />
            <Row label="Logged in (OS)" value={result.oneSignalLoggedIn ? "✅ sì" : "❌ no"} ok={result.oneSignalLoggedIn} />
            <Row label="External ID" value={result.externalId || "—"} ok={!!result.externalId} />
            <Row label="OneSignal ID" value={result.onesignalId || "—"} ok={!!result.onesignalId} />
            <Row label="Player ID" value={result.playerId || "—"} ok={!!result.playerId} />
            <Row label="Token" value={result.token ? result.token.slice(0, 40) + "…" : "—"} ok={!!result.token} />
            <Row label="OneSignal SW" value={result.oneSignalSWFound ? "✅ trovato" : "❌ non trovato"} ok={result.oneSignalSWFound} />
            
            <div className="pt-1 border-t border-border">
              <p className="font-semibold text-foreground mb-1">Service Workers ({result.serviceWorkers.length}):</p>
              {result.serviceWorkers.length === 0 && <p className="text-muted-foreground">Nessuno registrato</p>}
              {result.serviceWorkers.map((sw, i) => (
                <div key={i} className="pl-2 py-0.5 text-muted-foreground">
                  <span className="text-foreground">{sw.scriptURL.split("/").pop()}</span> — {sw.state} — scope: {sw.scope}
                </div>
              ))}
            </div>

            {result.errors.length > 0 && (
              <div className="pt-1 border-t border-border">
                <p className="font-semibold text-destructive mb-1">Errori ({result.errors.length}):</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-destructive/80 pl-2">• {err}</p>
                ))}
              </div>
            )}

            <div className="pt-1 border-t border-border">
              <p className="font-semibold text-foreground mb-1">ℹ️ Badge non compare su iPhone?</p>
              <p className="text-muted-foreground leading-relaxed">
                Se il badge sull'icona non appare dopo la reinstallazione, vai su{" "}
                <span className="font-medium text-foreground">Impostazioni → Notifiche → Milano Help</span>{" "}
                e disattiva/riattiva l'opzione <span className="font-medium text-foreground">"Badge"</span>.
                Questo resetta la cache di sistema del badge.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={ok ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">{ok ? "OK" : "—"}</Badge>
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground break-all">{value}</span>
    </div>
  );
}
