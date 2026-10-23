import { useEffect, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import OneSignalInit from "@/components/OneSignalInit";
import ScrollToTop from "@/components/ScrollToTop";
import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const SITE_TITLE = "Milano Help — Annunci, eventi e servizi a Milano";
const SITE_DESCRIPTION =
  "Milano Help, la community del tuo quartiere: scopri annunci, eventi, gruppi e servizi a Milano, provincia e Monza Brianza.";
const SHARE_DESCRIPTION =
  "La community del tuo quartiere: annunci, eventi, gruppi e servizi a Milano, provincia e Monza Brianza.";

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://www.milanohelp.it/#organization", name: "Milano Help", url: "https://www.milanohelp.it" },
    {
      "@type": "WebSite",
      "@id": "https://www.milanohelp.it/#website",
      name: "Milano Help",
      url: "https://www.milanohelp.it/",
      inLanguage: "it-IT",
      description: SHARE_DESCRIPTION,
      publisher: { "@id": "https://www.milanohelp.it/#organization" },
    },
  ],
});

const GTAG_INIT = `if (!window.__mhGtag) { window.__mhGtag = true;
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-G3B289BL7W'); }`;

const ONESIGNAL_INIT = `(function(){
  if (window.__mhOneSignal) return; window.__mhOneSignal = true;
  async function waitForActivation(registration) {
    if (registration.active) return;
    var sw = registration.installing || registration.waiting;
    if (!sw) return;
    await new Promise(function(resolve) {
      sw.addEventListener('statechange', function() { if (sw.state === 'activated') resolve(); });
      setTimeout(resolve, 5000);
    });
  }
  async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) return false;
    try {
      var regs = await navigator.serviceWorker.getRegistrations();
      var existing = regs.find(function(r) {
        var urls = [r.active && r.active.scriptURL, r.waiting && r.waiting.scriptURL, r.installing && r.installing.scriptURL].filter(Boolean);
        return urls.some(function(url) { return url.indexOf('OneSignalSDKWorker') !== -1; });
      });
      if (existing) { await waitForActivation(existing); return true; }
      var reg;
      try { reg = await navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' }); }
      catch (e) { reg = await navigator.serviceWorker.register(window.location.origin + '/OneSignalSDKWorker.js', { scope: '/' }); }
      await waitForActivation(reg);
      return true;
    } catch (err) { console.error('[SW] Registration failed:', err); return false; }
  }
  async function initOneSignal() {
    await ensureServiceWorker();
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        await OneSignal.init({
          appId: 'dada59a2-fab8-46aa-b12c-6ef78b12e976',
          serviceWorkerPath: null,
          notifyButton: { enable: true },
          allowLocalhostAsSecureOrigin: false,
        });
        window.oneSignalReady = true;
      } catch (err) {
        console.error('[OneSignal] Errore durante init:', err);
        window.oneSignalInitError = err && err.message ? err.message : String(err);
      }
    });
  }
  if (document.readyState === 'complete') initOneSignal();
  else window.addEventListener('load', initOneSignal);
})();`;

const SW_REGISTER = `if ('serviceWorker' in navigator && !window.__mhSw) { window.__mhSw = true;
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function(err) { console.error('[SW] Errore registrazione:', err); });
  });
}`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "google", content: "notranslate" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:site_name", content: "Milano Help" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "it_IT" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SHARE_DESCRIPTION },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SHARE_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.ico?v=4" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/logo/logo-192.png?v=3" },
      { rel: "apple-touch-icon", href: "/logo/logo-192.png?v=3" },
      { rel: "manifest", href: "/manifest.json" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON_LD },
      { src: "https://www.googletagmanager.com/gtag/js?id=G-G3B289BL7W", async: true },
      { children: GTAG_INIT },
      { src: "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js", defer: true },
      { children: ONESIGNAL_INIT },
      { children: SW_REGISTER },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it" translate="no" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OneSignalInit />
        <Toaster />
        <Sonner />
        <ScrollToTop />
        <AuthProvider>
          <AdminModeProvider>
            <Outlet />
          </AdminModeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">This page didn't load</h1>
        <p className="text-muted-foreground">Si è verificato un problema. Riprova tra qualche istante.</p>
        <div className="flex justify-center gap-3">
          <button
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <a href="/" className="rounded-lg border border-border px-4 py-2 text-foreground">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
